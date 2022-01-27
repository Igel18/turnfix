#include "subdivisionswidget.h"
#include "assignmenttablemodel.h"
#include "model/enums.h"
#include "model/entity/event.h"
#include "model/entity/score.h"
#include "model/settings/session.h"
#include "participants/participantsmodel.h"
#include "src/global/header/_delegates.h"
#include "src/global/header/_global.h"
#include "ui_subdivisionswidget.h"
#include <QDebug>
#include <QInputDialog>
#include <QMessageBox>
#include <QSqlQuery>
#include <QStandardItemModel>
#include "participantsquadmodel.h"


SubdivisionsWidget::SubdivisionsWidget(QWidget *parent)
    : QWidget(parent), ui(new Ui::SubdivisionsWidget)
{
    ui->setupUi(this);

    connect(ui->but_add, &QPushButton::clicked, this, &SubdivisionsWidget::addNewSquad);
    connect(ui->but_del, &QPushButton::clicked, this, &SubdivisionsWidget::removeSquad);
    connect(ui->but_add_2, &QPushButton::clicked, this, &SubdivisionsWidget::addToSquad);
    connect(ui->but_remove, &QPushButton::clicked, this, &SubdivisionsWidget::removeFromSquad);
    connect(ui->txt_nummer, &QLineEdit::editingFinished, this, &SubdivisionsWidget::updateSquadName);
}

SubdivisionsWidget::~SubdivisionsWidget()
{
    delete ui;
}

void SubdivisionsWidget::setup(Event *event, EntityManager *em)
{
    m_event = event;
    m_em = em;
    m_squads.clear();

    auto pNoSquadParticipantsModel = new ParticipantSquadModel( "", true, this );
    pNoSquadParticipantsModel->setSourceModel( m_event->participantsModel() );
    ui->re_table2->setModel(pNoSquadParticipantsModel);
    ui->re_table2->hideColumn( m_iSquadColIdx );

    auto pSquadParticipantsModel = new ParticipantSquadModel( "invalid_squad_name", true, this );
    pSquadParticipantsModel->setSourceModel( m_event->participantsModel() );
    ui->tbl_list->setModel( pSquadParticipantsModel );
    ui->tbl_list->hideColumn( m_iSquadColIdx );

    rg_model = new QStandardItemModel( m_event );
    rg_model->setObjectName( "SquadsModel" );
    rg_model->setHorizontalHeaderLabels( { "Riege", "Teiln.", "Manns.", "Gruppen", "1. Gerät" } );

    ui->lst_all->setModel(rg_model);

    connect(ui->lst_all->selectionModel(), &QItemSelectionModel::currentRowChanged, this, &SubdivisionsWidget::fetchRgData);
    connect(m_event->participantsModel(), &ParticipantsModel::modelReset, this, &SubdivisionsWidget::reloadSquads);

    reloadSquads(); // initial loading
}

void SubdivisionsWidget::reloadSquads()
{
    auto selectedRows = ui->lst_all->selectionModel()->selectedRows();
    auto selectedSquad = selectedRows.count() > 0 ? ui->lst_all->model()->data( selectedRows.at( 0 ) ).toString() : "";

    QMap< QString, SquadData > squads; // individual participants only for now

    auto pModel = m_event->participantsModel();

    for( auto i = 0; i < pModel->rowCount(); ++i ) {
        auto pParticipant = qvariant_cast< Score* >( pModel->data( pModel->index(i, 0), TF::ObjectRole ) );
        auto squadName = pParticipant->squad();
        if( !squadName.isEmpty() ){
            auto& squadData = squads[ squadName ];
            squadData.name = squadName;
            ++( squadData.participantsCount );
        }
    }

    const auto existing_squads = m_squads.keys();
    for( auto& key : existing_squads ){
        m_squads[ key ].participantsCount = 0;
        m_squads[ key ].teamsCount = 0;
        m_squads[ key ].groupsCount = 0;
        m_squads[ key ].firstDiscipline = "";
    }

    const auto reloaded_squads = squads.keys();
    for( auto& key : reloaded_squads ){
        m_squads[ key ] = squads.value( key );
    }

    rg_model->removeRows( 0, rg_model->rowCount() );

    const auto items = m_squads.values();

    for( auto& item : items )
    {
        if( !item.name.isEmpty() ){
            rg_model->appendRow( item.toModelItems() );
        }
    }

    auto itFound = std::find_if(items.begin(), items.end(), [ selectedSquad ](const SquadData& item){return item.name == selectedSquad; });

    if( itFound != items.end() ){
        ui->lst_all->selectRow( items.indexOf( *itFound ) );
    } else {
        ui->lst_all->selectRow( 0 );
    }

    auto bEnabled = rg_model->rowCount() > 0;

    ui->tbl_list->setEnabled( bEnabled );
    ui->txt_nummer->setEnabled( bEnabled );
    ui->but_remove->setEnabled( bEnabled );
    ui->but_add_2->setEnabled( bEnabled );

    auto pHorHeader = ui->lst_all->horizontalHeader();

    for( int i = 0; i < pHorHeader->count(); ++i ) {
        pHorHeader->setSectionResizeMode( i, i == 0 ? QHeaderView::Stretch : QHeaderView::Fixed );
        pHorHeader->resizeSection( i, i == 4 ? 90 : 47 );

        if( i == 4 ){
            ui->lst_all->setItemDelegateForColumn( i, new CmbDelegate( m_em, m_event, this ) );
        }
    }
}

//void SubdivisionsWidget::fillRETable2()
//{
//    re_model2->setRiege("");
//    ui->re_table2->setModel(re_model2);
//    QHeaderView::ResizeMode resizeModeRE2[] = {QHeaderView::ResizeToContents,
//                                               QHeaderView::Stretch,
//                                               QHeaderView::ResizeToContents,
//                                               QHeaderView::ResizeToContents,
//                                               QHeaderView::Stretch,
//                                               QHeaderView::ResizeToContents};
//    for (int i = 0; i < 6; i++) {
//        ui->re_table2->horizontalHeader()->setSectionResizeMode(i, resizeModeRE2[i]);
//    }
//    rg_model->removeRows(0, rg_model->rowCount());
//    QSqlQuery query;
//    query.prepare(
//        "SELECT var_riege, COUNT(DISTINCT int_teilnehmerid)+(SELECT COUNT(*) FROM "
//        "tfx_gruppen_x_teilnehmer INNER JOIN tfx_wertungen AS w USING (int_gruppenid) INNER JOIN "
//        "tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_Veranstaltungenid=? AND int_runde=? "
//        "AND var_riege=tfx_wertungen.var_riege) as count, (SELECT COUNT(*) FROM tfx_mannschaften "
//        "INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND "
//        "tfx_mannschaften.var_riege=tfx_wertungen.var_riege),(SELECT COUNT(int_gruppenid) FROM "
//        "tfx_wertungen AS w WHERE int_veranstaltungenid=? AND int_runde=? AND "
//        "var_riege=tfx_wertungen.var_riege), (SELECT var_name FROM tfx_riegen_x_disziplinen INNER "
//        "JOIN tfx_disziplinen USING (int_disziplinenid) WHERE "
//        "int_veranstaltungenid=tfx_wettkaempfe.int_veranstaltungenid AND "
//        "int_runde=tfx_wertungen.int_runde AND var_riege=tfx_wertungen.var_riege AND "
//        "bol_erstes_geraet='true' LIMIT 1) FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING "
//        "(int_wettkaempfeid) WHERE int_veranstaltungenid=? AND tfx_wertungen.int_runde=? AND "
//        "var_riege != '' GROUP BY var_riege, int_runde, int_veranstaltungenid");

//    query.bindValue(0, this->m_event->mainEvent()->id());
//    query.bindValue(1, this->m_event->round());
//    query.bindValue(2, this->m_event->id());
//    query.bindValue(3, this->m_event->mainEvent()->id());
//    query.bindValue(4, this->m_event->round());
//    query.bindValue(5, this->m_event->mainEvent()->id());
//    query.bindValue(6, this->m_event->round());
//    query.exec();
//    while (query.next()) {
//        ui->tbl_list->setEnabled(true);
//        ui->txt_nummer->setEnabled(true);
//        ui->but_remove->setEnabled(true);
//        ui->but_add_2->setEnabled(true);
//        rg_model->insertRow(rg_model->rowCount());
//        rg_model->setItem(query.at(), 0, new QStandardItem(query.value(0).toString()));
//        rg_model->item(query.at(), 0)->setEditable(false);
//        rg_model->setItem(query.at(), 1, new QStandardItem(query.value(1).toString()));
//        rg_model->item(query.at(), 1)->setEditable(false);
//        rg_model->setItem(query.at(), 2, new QStandardItem(query.value(2).toString()));
//        rg_model->item(query.at(), 2)->setEditable(false);
//        rg_model->setItem(query.at(), 3, new QStandardItem(query.value(3).toString()));
//        rg_model->item(query.at(), 3)->setEditable(false);
//        rg_model->setItem(query.at(), 4, new QStandardItem(query.value(4).toString()));
//    }
//    QHeaderView::ResizeMode resizeModeRE[] = {QHeaderView::Stretch,
//                                              QHeaderView::Fixed,
//                                              QHeaderView::Fixed,
//                                              QHeaderView::Fixed,
//                                              QHeaderView::Fixed};
//    QStringList heads;
//    heads << "Riege"
//          << "Teiln."
//          << "Manns."
//          << "Gruppen"
//          << "1. Gerät";
//    for (int i = 0; i < 5; i++) {
//        ui->lst_all->horizontalHeader()->setSectionResizeMode(i, resizeModeRE[i]);
//        rg_model->setHeaderData(i, Qt::Horizontal, heads[i]);
//    }
//    ui->lst_all->horizontalHeader()->resizeSection(1, 45);
//    ui->lst_all->horizontalHeader()->resizeSection(2, 45);
//    ui->lst_all->horizontalHeader()->resizeSection(3, 45);
//    ui->lst_all->horizontalHeader()->resizeSection(4, 90);
//    ui->lst_all->setItemDelegateForColumn(4, new CmbDelegate(this->m_event));
//    ui->lst_all->selectRow(0);
//}

void SubdivisionsWidget::setSquadNameForSelectedItems( QTableView* pTableView, QString squadName )
{
    const auto indexes = pTableView->selectionModel()->selectedRows( m_iSquadColIdx );
    auto pSortFilterModel = qobject_cast< ParticipantSquadModel* >(pTableView->model());
    Q_ASSERT( pSortFilterModel );

    QVector< QModelIndex > vIdxToUpdate;

    for( const auto& idx: indexes ) {
        vIdxToUpdate.append( pSortFilterModel->mapToSource(idx) );
    }

    for( const auto& idx: vIdxToUpdate ){
        pSortFilterModel->sourceModel()->setData( idx, squadName );
    }
}

void SubdivisionsWidget::addToSquad()
{
    setSquadNameForSelectedItems(ui->re_table2, ui->txt_nummer->text());
    reloadSquads();
    emit dataChanged();
}

void SubdivisionsWidget::removeFromSquad()
{
    setSquadNameForSelectedItems(ui->tbl_list, "");
    reloadSquads();
    _global::updateRgDis( m_event, m_em );
    emit dataChanged();
}

void SubdivisionsWidget::addNewSquad()
{
    bool ok;
    QString text = QInputDialog::getText(this, tr("Namen festlegen"), tr("Bitte einen Namen für die Riege Eingeben"), QLineEdit::Normal, "", &ok);

    if ( ok ) {
        if( text.isEmpty() ){
            QMessageBox::information(this, "Ungültiger Name", "Sie haben keinen Namen eingegeben!");
            return;
        }

        SquadData newSquad;
        newSquad.name = text;
        if( !m_squads.contains( newSquad.name ) ){
            m_squads.insert( newSquad.name, newSquad );
            reloadSquads();
            auto foundItems = rg_model->findItems( newSquad.name );
            if( foundItems.count() > 0 ){
                ui->lst_all->selectRow( foundItems.at( 0 )->index().row() );
            }
        }
    }
}

void SubdivisionsWidget::removeSquad()
{
    auto selectedRows = ui->lst_all->selectionModel()->selectedRows();
    auto selectedSquad = selectedRows.count() > 0 ? ui->lst_all->model()->data( selectedRows.at( 0 ) ).toString() : "";

    ui->tbl_list->selectAll();
    setSquadNameForSelectedItems(ui->tbl_list, "");

    m_squads.remove( selectedSquad );

    reloadSquads();
    _global::updateRgDis( m_event, m_em );
    emit dataChanged();
}

void SubdivisionsWidget::fetchRgData()
{
    int row = ui->lst_all->selectionModel()->currentIndex().row();
    if (row < 0)
        return;
    QString riege = rg_model->item(row, 0)->text();

    qobject_cast< ParticipantSquadModel* >( ui->tbl_list->model() )->setSquadName( riege );

    ui->txt_nummer->setText( riege );
    QHeaderView::ResizeMode resizeModeRE2[] = {QHeaderView::ResizeToContents,
                                               QHeaderView::Stretch,
                                               QHeaderView::ResizeToContents,
                                               QHeaderView::ResizeToContents,
                                               QHeaderView::Stretch,
                                               QHeaderView::ResizeToContents};
    for (int i = 0; i < 6; i++) {
        ui->tbl_list->horizontalHeader()->setSectionResizeMode(i, resizeModeRE2[i]);
    }
}

void SubdivisionsWidget::updateSquadName()
{
    auto newSquadName = ui->txt_nummer->text().trimmed();

    if( newSquadName.isEmpty() ){
        removeSquad();
        return;
    }

    auto selectedRows = ui->lst_all->selectionModel()->selectedRows();
    auto selectedSquad = selectedRows.count() > 0 ? ui->lst_all->model()->data( selectedRows.at( 0 ) ).toString() : "";

    ui->tbl_list->selectAll();
    setSquadNameForSelectedItems( ui->tbl_list, newSquadName );

    m_squads.remove( selectedSquad );

    reloadSquads();

    auto foundItems = rg_model->findItems( newSquadName );
    if( foundItems.count() > 0 ){
        ui->lst_all->selectRow( foundItems.at( 0 )->index().row() );
    }

    _global::updateRgDis( m_event, m_em );
    emit dataChanged();
}
