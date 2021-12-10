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

    auto pNoSquadParticipantsModel = new ParticipantSquadModel( "", true, this );
    pNoSquadParticipantsModel->setSourceModel( m_event->participantsModel() );
    ui->re_table2->setModel(pNoSquadParticipantsModel);
    ui->re_table2->hideColumn( m_iSquadColIdx );

    auto pSquadParticipantsModel = new ParticipantSquadModel( "invalid_squad_name", true, this );
    pSquadParticipantsModel->setSourceModel( m_event->participantsModel() );
    ui->tbl_list->setModel( pSquadParticipantsModel );
    ui->tbl_list->hideColumn( m_iSquadColIdx );

    rg_model = new QStandardItemModel(this);
    rg_model->setColumnCount(4);
    ui->lst_all->setModel(rg_model);

    connect(ui->lst_all->selectionModel(), &QItemSelectionModel::currentRowChanged, this, &SubdivisionsWidget::fetchRgData);
    connect(m_event->participantsModel(), &ParticipantsModel::modelReset, this, &SubdivisionsWidget::reloadSquads);

    reloadSquads(); // initial loading
}

void SubdivisionsWidget::reloadSquads()
{
    rg_model->removeRows( 0, rg_model->rowCount() );

    QHash<QString, int > squads; // individual participants only for now

    for( auto i = 0; i < m_event->participantsModel()->rowCount(); ++i ) {
        auto idx = m_event->participantsModel()->index(i, 0);
        auto pParticipant = qvariant_cast< Score* >( m_event->participantsModel()->data(idx, TF::ObjectRole) );
        auto squadName = pParticipant->squad();
        squads[ squadName ] = ++squads[ squadName ];
    }

    const auto squadNames = squads.keys();
    for( const auto& squadName : squadNames )
    {
        if( !squadName.isEmpty() ){
            QList< QStandardItem* > items = {
                new QStandardItem(squadName),
                new QStandardItem(QString("%1").arg(squads.value(squadName))),
                new QStandardItem("0"),
                new QStandardItem("0"),
                new QStandardItem("gerat value"),
            };

            for(auto i = 0; i < 4; ++i) {
                items.at( i )->setEditable( false );
            }

            rg_model->appendRow( items );
        }
    }

    auto bEnabled = rg_model->rowCount() > 0;

    ui->tbl_list->setEnabled( bEnabled );
    ui->txt_nummer->setEnabled( bEnabled );
    ui->but_remove->setEnabled( bEnabled );
    ui->but_add_2->setEnabled( bEnabled );

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
    QList< QHeaderView::ResizeMode > resizeMode = { QHeaderView::Stretch, QHeaderView::Fixed, QHeaderView::Fixed, QHeaderView::Fixed, QHeaderView::Fixed };
    QStringList heads = { "Riege", "Teiln.", "Manns.", "Gruppen", "1. Gerät" };
    for (int i = 0; i < 4; i++) {
        ui->lst_all->horizontalHeader()->setSectionResizeMode(i, resizeMode.at( i ));
        rg_model->setHeaderData( i, Qt::Horizontal, heads.at(i) );
    }

    ui->lst_all->horizontalHeader()->resizeSection(1, 45);
    ui->lst_all->horizontalHeader()->resizeSection(2, 45);
    ui->lst_all->horizontalHeader()->resizeSection(3, 45);
    ui->lst_all->horizontalHeader()->resizeSection(4, 90);
    auto pCmbDelegate = new CmbDelegate( m_em ,m_event, this );
    ui->lst_all->setItemDelegateForColumn(4, pCmbDelegate );
    ui->lst_all->selectRow( 0 );
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

void SubdivisionsWidget::setSquadNameForSelected( QTableView* pTableView, QString squadName )
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
    setSquadNameForSelected(ui->re_table2, ui->txt_nummer->text());
    reloadSquads();
}

void SubdivisionsWidget::removeFromSquad()
{
    setSquadNameForSelected(ui->tbl_list, "");
    reloadSquads();
    _global::updateRgDis( m_event, m_em );
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

        ui->tbl_list->setEnabled(true);
        ui->txt_nummer->setEnabled(true);
        ui->but_remove->setEnabled(true);
        ui->but_add_2->setEnabled(true);
        rg_model->insertRow(rg_model->rowCount());
        rg_model->setItem(rg_model->rowCount() - 1, 0, new QStandardItem(text));
        rg_model->item(rg_model->rowCount() - 1, 0)->setEditable(false);
        rg_model->setItem(rg_model->rowCount() - 1, 1, new QStandardItem("0"));
        rg_model->item(rg_model->rowCount() - 1, 1)->setEditable(false);
        rg_model->setItem(rg_model->rowCount() - 1, 2, new QStandardItem("0"));
        rg_model->item(rg_model->rowCount() - 1, 2)->setEditable(false);
        rg_model->setItem(rg_model->rowCount() - 1, 3, new QStandardItem(""));
        ui->lst_all->selectRow(rg_model->rowCount() - 1);
    }
}

void SubdivisionsWidget::removeSquad()
{
    ui->tbl_list->selectAll();
    setSquadNameForSelected(ui->tbl_list, "");
    reloadSquads();
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
    ui->tbl_list->selectAll();
    setSquadNameForSelected(ui->tbl_list, ui->txt_nummer->text());
    reloadSquads();
}
