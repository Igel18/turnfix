#include "selectlayoutdialog.h"
#include "ui_selectlayoutdialog.h"
#include "model/entitymanager.h"
#include "model/entity/event.h"
#include "model/repository/layoutrepository.h"
#include "masterdata/layoutmodel.h"
#include <QSqlQuery>

SelectLayoutDialog::SelectLayoutDialog(QWidget *parent)
    : QDialog(parent)
    , ui(new Ui::SelectLayoutDialog)
{
    ui->setupUi(this);
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);
    connect(ui->cmb_layout, SIGNAL(currentIndexChanged(int)), this, SLOT(layoutSelectionChange()));
    connect(ui->bbx_done, SIGNAL(accepted()), this, SLOT(closeDialog()));
    connect(ui->bbx_done, SIGNAL(rejected()), this, SLOT(close()));


//    QSqlQuery layoutListQuery;
//    layoutListQuery.prepare("SELECT int_layoutid, var_name FROM tfx_layouts ORDER BY var_name");
//    layoutListQuery.exec();

//    while (layoutListQuery.next()) {
//      //  ui->cmb_layout->addItems(layout[1])
//        ui->cmb_layout->addItem(layoutListQuery.value(1).toString(),
//                                layoutListQuery.value(0).toInt());
//    }
}

void SelectLayoutDialog::setup(EntityManager *em)
{
    m_em = em;
    auto layouts = m_em->layoutRepository()->loadAll();

    for(int i=0;i<layouts.size();i++){
        ui->cmb_layout->addItem(layouts[i]->name(),layouts[i]->id());
    }
}

SelectLayoutDialog::~SelectLayoutDialog()
{
    delete ui;
}

void SelectLayoutDialog::layoutSelectionChange()
{


//    QSqlQuery getCommentQuery;
//    getCommentQuery.prepare("SELECT txt_comment FROM tfx_layouts WHERE int_layoutid=?");
//    getCommentQuery.bindValue(0, ui->cmb_layout->itemData(ui->cmb_layout->currentIndex()));
//    getCommentQuery.exec();
//    getCommentQuery.next();
    auto cmbboxindex=ui->cmb_layout->currentIndex();
    auto layouts = m_em->layoutRepository()->loadAll(&cmbboxindex);
    auto layoutitems = layouts.count();
    if (layoutitems==0)
    {
        return;
    }

    auto layout = layouts.first();
    ui->txt_comment->setText(layout->comment());
}

int SelectLayoutDialog::getLayoutID()
{
    return ui->cmb_layout->itemData(ui->cmb_layout->currentIndex()).toInt();
}

void SelectLayoutDialog::closeDialog()
{
    done(1);
}
