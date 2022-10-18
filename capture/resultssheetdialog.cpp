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
    m_sortFilterModel = new QSortFilterProxyModel(this);
    m_sortFilterModel->setSourceModel(pe_model);
    ui->pe_table->setModel( m_sortFilterModel );
    ui->pe_table->setSortingEnabled(true);
    ui->chk_jury->setChecked( Settings::juryResults );
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
    ui->cmb_squadStatus->setModel( pStatusModel );

    int round = m_event->round();
    auto items = m_em->squadDisciplineRepository()->load( m_event, riege, &geraet, &round );

    if( items.isEmpty() ){
        m_pSquadDiscipline = new SquadDiscipline();
        m_pSquadDiscipline->setEventId( m_event->id() );
        m_pSquadDiscipline->setDisciplineId( geraet );
        m_pSquadDiscipline->setSquad( riege );
        m_pSquadDiscipline->setRound( round );
        // m_pSquadDiscipline->setStart( false );
    } else {
        m_pSquadDiscipline = items.at( 0 );
        ui->cmb_squadStatus->setCurrentIndex( ui->cmb_squadStatus->findData( m_pSquadDiscipline->statusId(), TF::IdRole ) );
    }

    connect( ui->cmb_squadStatus, qOverload<int>(&QComboBox::currentIndexChanged), this, &ResultsSheetDialog::changeSquadDisciplineStatus );

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
        resizeMode.append( qMakePair( QHeaderView::ResizeToContents, 60 ) );
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

    if( col == pe_model->columnCount() - 1 ) {
        if (pe_model->index( row + 1, 4 ).isValid()) {
            ui->pe_table->setCurrentIndex(pe_model->index( row + 1, 4 ) );
        } else {
            ui->pe_table->setCurrentIndex(pe_model->index( 0, 4 ) );
        }
    } else {
        ui->pe_table->setCurrentIndex( pe_model->index( row, col + 1 ) );
        if( berechnen ){
            calc();
        }
    }
}

void ResultsSheetDialog::changeSquadDisciplineStatus(int index)
{
    auto statusId = ui->cmb_squadStatus->itemData( index, TF::IdRole ).toInt();
    m_pSquadDiscipline->setStatusId( statusId );
    m_em->squadDisciplineRepository()->persist( m_pSquadDiscipline );
}

void ResultsSheetDialog::saveClose()
{
    finishEdit();
    close();
}

void ResultsSheetDialog::calc()
{
    auto pDiscipline = m_em->disciplineRepository()->loadDiscipline( geraet );
    auto pFormula = pDiscipline->formula();
    const QString sFormula = pFormula ? pFormula->formula() : "";
    //const QString sFormula = pDiscipline->resultFormula().isEmpty() ? "1*x" : pDiscipline->resultFormula();
    auto sVars = QString( sFormula ).replace( QRegExp("[^A-Z]"), " " ).simplified().split( " " ).join( "," );

    QVector< double > dVars;
    double max = 0.0;
    for( int i = 4; i < pe_model->columnCount() - 1; ++i) {
        dVars.append( pe_model->data(pe_model->index(ui->pe_table->currentIndex().row(), i)).toDouble() );
        max = qMax( dVars.last(), max );
    }

    FunctionParser fparser;
    fparser.Parse( sFormula.toStdString(), sVars.toStdString() );
    double res = fparser.Eval(dVars.data());

    if( max == 0 ){
        res = 0.0;
    }

    auto idx = pe_model->index(ui->pe_table->currentIndex().row(), pe_model->columnCount() - 1);
    auto value = _global::strLeistung(res, pDiscipline->unit(), pDiscipline->inputMask(), pDiscipline->decimals());
    pe_model->setData( idx, value );
}

void ResultsSheetDialog::saveJuryMethod()
{
    Settings::updateJuryResults(ui->chk_jury->isChecked());
}
