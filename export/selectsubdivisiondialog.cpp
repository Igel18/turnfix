#include "selectsubdivisiondialog.h"
#include "ui_selectsubdivisiondialog.h"

#include "model/entity/event.h"
#include "src/global/header/_global.h"
#include <QSqlQuery>
#include <QStandardItemModel>

SelectSubdivisionDialog::SelectSubdivisionDialog(Event *event, QWidget *parent)
    : QDialog(parent), ui(new Ui::SelectSubdivisionDialog)
{
    ui->setupUi(this);
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);

    m_event = event;

    connect(ui->but_select, SIGNAL(clicked()), this, SLOT(select1()));
    initData();
}

SelectSubdivisionDialog::~SelectSubdivisionDialog()
{
    delete ui;
}

void SelectSubdivisionDialog::initData()
{
    auto pModel = m_event->findChild< QStandardItemModel* >( "SquadsModel", Qt::FindDirectChildrenOnly );
    for( auto i = 0; i < pModel->rowCount(); ++i ){
        ui->lst_rg->addItem( new QListWidgetItem( pModel->item( i )->text() ) );
    }
//    QSqlQuery query2;
//    query2.prepare("SELECT DISTINCT(var_riege) FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND int_runde=? ORDER BY var_riege");
//    query2.bindValue(0, this->m_event->mainEvent()->id());
//    query2.bindValue(1, this->m_event->round());
//    query2.exec();
//    while (query2.next()) {
//        QListWidgetItem *itm = new QListWidgetItem(query2.value(0).toString());
//        ui->lst_rg->addItem(itm);
//    }
}

void SelectSubdivisionDialog::select1()
{
    rg.clear();
    QList<QListWidgetItem *> selected = ui->lst_rg->selectedItems();
    for (int i=0;i<selected.size();i++) {
        rg.append(selected.at(i)->text());
    }
    done(1);
}

QStringList SelectSubdivisionDialog::getRg()
{
    return rg;
}
