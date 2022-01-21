#include "selectparticipantdialog.h"
#include "ui_selectparticipantdialog.h"

#include "competitions/competitionmodel.h"
#include "competitions/competitionproxymodel.h"
#include "model/entitymanager.h"
#include "model/repository/competitionrepository.h"
#include "model/settings/session.h"
#include "results/resultstablemodel.h"
#include "src/global/header/result_calc.h"


SelectParticipantDialog::SelectParticipantDialog( QWidget *parent )
    : QDialog(parent), ui( new Ui::SelectParticipantDialog )
{
    ui->setupUi( this );
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);

    m_em = Session::getInstance()->getEntityManager();
    m_event = Session::getInstance()->getEvent();

    er_model = new ResultsTableModel( m_em );
    ui->tbl_tn->setModel(er_model);

    connect( ui->but_select, &QPushButton::clicked, this, &SelectParticipantDialog::submit );
    connect( ui->cmb_wk, qOverload< int >( &QComboBox::currentIndexChanged ), this, &SelectParticipantDialog::updateList );

    auto pProxyModel = new CompetitionProxyModel( "", this );
    auto pCompetitionModel = m_event->findChild< CompetitionModel* >();
    pProxyModel->setSourceModel( pCompetitionModel );
    ui->cmb_wk->setModel(  pProxyModel );
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

void SelectParticipantDialog::updateList()
{
    auto pCompetition = qvariant_cast< Competition* >( ui->cmb_wk->currentData() );

    if( pCompetition ){
        auto resultsData = Result_Calc::resultArrayNew( pCompetition );
        er_model->setList( resultsData, pCompetition->number(), m_event->id(), pCompetition->type() );

        if( !resultsData.isEmpty() ) {
            auto horHeader = ui->tbl_tn->horizontalHeader();
            int columnsCount = resultsData.at( 0 ).size() - 1;

            for( auto col = 0; col < columnsCount; ++col ){
                horHeader->setSectionResizeMode( col, ( ( col == 1 ) || ( col == 2 ) ) ? QHeaderView::Stretch : QHeaderView::ResizeToContents );
                if( col > 2 ){
                    ui->tbl_tn->hideColumn( col );
                }
            }
        }
    }
}

void SelectParticipantDialog::submit()
{
    for( auto& index : ui->tbl_tn->selectionModel()->selectedRows() ){
        tnlist.append(er_model->data(er_model->index( index.row(), 3 ), Qt::DisplayRole ).toInt());
    }

    auto pCompetition = qvariant_cast< Competition* >( ui->cmb_wk->currentData() );

    tnwk = pCompetition->number();

    done(1);
}
