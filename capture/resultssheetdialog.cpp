#include "resultssheetdialog.h"
#include "libs/fparser/fparser.hh"
#include "masterdata/statusmodel.h"
#include "model/entitymanager.h"
#include "model/entity/event.h"
#include "model/repository/disciplinerepository.h"
#include "model/repository/squaddisciplinerepository.h"
#include "resultssheettablemodel.h"
#include "src/global/header/_delegates.h"
#include "src/global/header/_global.h"
#include "src/global/header/settings.h"
#include "ui_resultssheetdialog.h"
#include <math.h>
#include <QMessageBox>
#include <QSqlQuery>

ResultsSheetDialog::ResultsSheetDialog(EntityManager* em, Event *event, QWidget *parent)
    : QDialog(parent), ui(new Ui::ResultsSheetDialog), m_em(em), m_event(event)
{
    ui->setupUi(this);

    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint | Qt::WindowMaximizeButtonHint);

    pe_model = new ResultsSheetTableModel( em, m_event );
    ui->pe_table->setModel( pe_model );
    ui->chk_jury->setChecked(Settings::juryResults);
    connect(ui->but_save, SIGNAL(clicked()), this, SLOT(saveClose()));
    connect(ui->chk_jury, SIGNAL(stateChanged(int)), this, SLOT(fillPETable()));
    connect(ui->chk_jury, SIGNAL(stateChanged(int)), this, SLOT(saveJuryMethod()));
}

void ResultsSheetDialog::init(QString r, int g, bool k)
{
    riege = r;
    geraet = g;
    kuer = k;

    auto pDiscipline = m_em->disciplineRepository()->loadDiscipline( geraet );
    ui->lbl_icon->setPixmap( pDiscipline->icon() );
    ui->lbl_disrg->setText( QString("%1 %2 - Riege %3").arg( pDiscipline->name() ).arg( kuer ? "(Kür)" : "(Pflicht)" ).arg( riege ) );
    versuche = pDiscipline->attempts();
    berechnen = pDiscipline->calculate();

    bool scoreSheet = true;
    auto pStatusModel = new StatusModel( m_em, this );
    pStatusModel->fetchStatuses( nullptr, &scoreSheet );
    ui->cmb_status1->setModel( pStatusModel );

    auto items = m_em->squadDisciplineRepository()->load( m_event, riege );

    auto itFound = std::find_if(items.begin(), items.end(), [ this ]( SquadDiscipline* pItem ){
            return ( pItem->disciplineId() == geraet ) && ( pItem->round() == m_event->round() );
    });

    if( itFound != items.end() ){
        m_pSquadDiscipline = *itFound;
        ui->cmb_status1->setCurrentIndex( ui->cmb_status1->findData( (*itFound)->statusId(), TF::IdRole ) );
    }

    connect( ui->cmb_status1, qOverload<int>(&QComboBox::currentIndexChanged), this, &ResultsSheetDialog::changeSquadDisciplineStatus );

    fillPETable();
}

void ResultsSheetDialog::fillPETable()
{
    ui->pe_table->clearSelection();

    pe_model->setTableData(riege, geraet, versuche, kuer, ui->chk_jury->isChecked());

    QList< QPair< QHeaderView::ResizeMode, int > > resizeMode = {
        { QHeaderView::ResizeToContents, 40 },
        { QHeaderView::Stretch, 200 },
        { QHeaderView::Stretch, 200 },
        { QHeaderView::ResizeToContents, 35 }
    };

    for ( int i = 4; i < pe_model->columnCount(); ++i ) {
        resizeMode.append( qMakePair(  QHeaderView::ResizeToContents, 60 ) );
    }

    auto pHeader = ui->pe_table->horizontalHeader();
    for( int i = 0; i < pe_model->columnCount(); ++i ) {
        pHeader->setSectionResizeMode( i, resizeMode.at( i ).first );
        pHeader->resizeSection( i, resizeMode.at( i ).second );

        if (i > 3) {
            EditorDelegate *ed = new EditorDelegate;
            connect(ed, SIGNAL(closeEditor(QWidget*,QAbstractItemDelegate::EndEditHint)), this, SLOT(finishEdit()));
            ui->pe_table->setItemDelegateForColumn(i, ed);
        } else if (i==3) {
            ui->pe_table->setItemDelegateForColumn(i, new AlignCItemDelegate);
        }
    }
    if (versuche>1) {
        for (int i=0;i<pe_model->rowCount();i++) {
            if (i%versuche == 0) {
                ui->pe_table->setSpan(i, 0, versuche, 1);
                ui->pe_table->setSpan(i, 1, versuche, 1);
                ui->pe_table->setSpan(i, 2, versuche, 1);
                ui->pe_table->setSpan(i, 3, versuche, 1);
            }
        }
    }
    ui->pe_table->setCurrentIndex(pe_model->index(0, 4));
    ui->pe_table->edit(ui->pe_table->currentIndex());
}

void ResultsSheetDialog::finishEdit()
{
    int row = ui->pe_table->currentIndex().row();
    int col = ui->pe_table->currentIndex().column();
    if (col == pe_model->columnCount()-1) {
        if (pe_model->index(row+1,4).isValid()) {
            ui->pe_table->setCurrentIndex(pe_model->index(row + 1, 4));
        } else {
            ui->pe_table->setCurrentIndex(pe_model->index(0, 4));
        }
    } else {
        ui->pe_table->setCurrentIndex(pe_model->index(row, col + 1));
        if (berechnen) calc();
    }
}

void ResultsSheetDialog::changeSquadDisciplineStatus(int index)
{
    if( m_pSquadDiscipline ){
        auto statusId = ui->cmb_status1->itemData( index, TF::IdRole ).toInt();
        m_pSquadDiscipline->setStatusId( statusId );
        m_em->squadDisciplineRepository()->persist( m_pSquadDiscipline );
    }
}

void ResultsSheetDialog::saveClose()
{
    finishEdit();
    close();
}

void ResultsSheetDialog::calc()
{
    QStringList lst;
    lst << "A"<<"B"<<"C"<<"D"<<"E"<<"F"<<"G"<<"H"<<"I"<<"J"<<"K"<<"L"<<"M"<<"N"<<"O"<<"P"<<"Q"<<"R"<<"S"<<"T"<<"U"<<"V"<<"W"<<"X"<<"Y"<<"Z";
    QSqlQuery query2;
    query2.prepare("SELECT tfx_formeln.var_formel, int_berechnung, var_einheit, var_maske FROM tfx_disziplinen LEFT JOIN tfx_formeln USING (int_formelid) WHERE int_disziplinenid=?");
    query2.bindValue(0,geraet);
    query2.exec();
    query2.next();
    QString vars;
    for (int i=0;i<lst.size();i++) {
        if (query2.value(0).toString().contains(lst.at(i))) {
            vars += lst.at(i)+",";
        }
    }
    vars = vars.left(vars.length()-1);
    FunctionParser fparser;
    fparser.Parse(query2.value(0).toString().toStdString(),vars.toStdString());
    int size = pe_model->columnCount()-5;
    QVector<double> Vars(size);
    double max=0.0;
    for (int i=4;i<pe_model->columnCount()-1;i++) {
        Vars[i - 4] = QVariant(
                          pe_model->data(pe_model->index(ui->pe_table->currentIndex().row(), i)))
                          .toDouble();
        if (Vars[i-4]>max) max = Vars[i-4];
    }
    double res = fparser.Eval(Vars.data());
    if (max==0) res = 0.0;
    pe_model->setData(pe_model->index(ui->pe_table->currentIndex().row(),
                                      pe_model->columnCount() - 1),
                      _global::strLeistung(res,
                                           query2.value(2).toString(),
                                           query2.value(3).toString(),
                                           query2.value(1).toInt()),
                      Qt::EditRole);
}

void ResultsSheetDialog::saveJuryMethod()
{
    Settings::updateJuryResults(ui->chk_jury->isChecked());
}
