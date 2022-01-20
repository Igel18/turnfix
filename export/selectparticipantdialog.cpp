#include "selectparticipantdialog.h"
#include "model/entity/competition.h"
#include "model/entitymanager.h"
#include "model/repository/competitionrepository.h"
#include "model/settings/session.h"
#include "results/resultstablemodel.h"
#include "src/global/header/_delegates.h"
#include "src/global/header/_global.h"
#include "src/global/header/result_calc.h"
#include "ui_selectparticipantdialog.h"
#include <QList>
#include <QSqlQuery>

SelectParticipantDialog::SelectParticipantDialog( QWidget *parent )
    : QDialog(parent), ui( new Ui::SelectParticipantDialog )
{
    ui->setupUi( this );

    m_em = Session::getInstance()->getEntityManager();
    m_event = Session::getInstance()->getEvent();

    er_model = new ResultsTableModel( m_em );
    ui->tbl_tn->setModel(er_model);
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);
    connect(ui->cmb_wk, SIGNAL(currentIndexChanged(int)), this, SLOT(updateList()));
    connect(ui->but_select, SIGNAL(clicked()), this, SLOT(submit()));
    initData();
}

SelectParticipantDialog::~SelectParticipantDialog()
{
    delete ui;
}

QList<int> SelectParticipantDialog::getTnList()
{
    return tnlist;
}

QString SelectParticipantDialog::getTnWk()
{
    return tnwk;
}

void SelectParticipantDialog::initData()
{
    auto competitions = m_em->competitionRepository()->fetchByEvent( m_event );
    for( auto& item : competitions ){
        ui->cmb_wk->addItem( item->number() + " " + item->name(), item->number());
    }

    updateList();
}

void SelectParticipantDialog::updateList()
{
    if (ui->cmb_wk->count() > 0) {
        auto competitionNumber = ui->cmb_wk->itemData( ui->cmb_wk->currentIndex()).toString();
        auto competition = m_em->competitionRepository()->fetchByNumber( m_event, competitionNumber );
        auto list = Result_Calc::resultArrayNew( competition );
        int wktyp = competition->type();
        int hwk = m_event->id(); // this->m_event->mainEvent()->id();

        er_model->setList( list, competitionNumber, hwk, wktyp, false );

//        if( !list.isEmpty() ) {
//            for (int i = 0; i < list.at( 0 ).count(); ++i ) {
//                if( (i == 1) || ( i == 2 ) ){
//                    ui->tbl_tn->horizontalHeader()->setSectionResizeMode( i, QHeaderView::Stretch );
//                } else {
//                    ui->tbl_tn->horizontalHeader()->setSectionResizeMode( i, QHeaderView::ResizeToContents );
//                }

//                if (i > 2) {
//                    ui->tbl_tn->setItemDelegateForColumn(i, new AlignItemDelegate);
//                }
//            }
//            ui->tbl_tn->hideColumn( 3 );
//        }
    }
}

void SelectParticipantDialog::submit()
{
    QModelIndexList indexes = ui->tbl_tn->selectionModel()->selectedRows();
    for (int i=0;i<indexes.size();i++) {
        tnlist << er_model->data(er_model->index(indexes.at(i).row(),3),Qt::DisplayRole).toInt();
    }
    tnwk = ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()).toString();
    done(1);
}
