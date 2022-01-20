#include "resultswidget.h"
#include "ui_resultswidget.h"
#include "resultstablemodel.h"
#include "competitions/competitionmodel.h"
#include "model/entity/competition.h"
#include "competitionproxymodel.h"
#include "src/global/header/_delegates.h"
#include "src/global/header/result_calc.h"


ResultsWidget::ResultsWidget(QWidget *parent)
    : QWidget(parent), ui(new Ui::ResultsWidget)
{
    ui->setupUi( this );
    connect( ui->cmb_selectwk, qOverload< int >( &QComboBox::currentIndexChanged ), this, &ResultsWidget::fillERTable );
}

void ResultsWidget::setup(Event *event, EntityManager *em, CompetitionModel* pModel)
{
    m_event = event;
    m_em = em;

    er_model = new ResultsTableModel( m_em );
    ui->er_table->setModel(er_model);

    auto pProxyModel = new CompetitionProxyModel( this );
    pProxyModel->setSourceModel( pModel );
    ui->cmb_selectwk->setModel(  pProxyModel );
}

ResultsWidget::~ResultsWidget()
{
    delete ui;
}

void ResultsWidget::fillERTable()
{
    auto pCompetition = qvariant_cast< Competition* >(ui->cmb_selectwk->currentData());

    if( pCompetition ){
        auto resultsData = Result_Calc::resultArrayNew( pCompetition );
        er_model->setList( resultsData, pCompetition->number(), m_event->id(), pCompetition->type() );

        if( !resultsData.isEmpty() ) {
            auto horHeader = ui->er_table->horizontalHeader();
            int columnsCount = resultsData.at( 0 ).size() - 1;

            for( auto col = 0; col < columnsCount; ++col ){
                horHeader->setSectionResizeMode( col, ( ( col == 1 ) || ( col == 2 ) ) ? QHeaderView::Stretch : QHeaderView::ResizeToContents );
                if( col > 2 ){
                    ui->er_table->setItemDelegateForColumn( col, new AlignItemDelegate );
                }
            }
        }
    }
}
