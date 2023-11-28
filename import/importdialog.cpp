#include "importdialog.h"
#include <QFileDialog>
#include <QDialog>
#include "ui_importdialog.h"


ImportDialog::ImportDialog(Event *event, EntityManager *em, QWidget *parent)
    : QDialog(parent)
    , ui(new Ui::ImportDialog)
    , m_event(event)
    , m_em(em)
{
    ui->setupUi(this);
    connect(ui->FileOpenDlg,  SIGNAL(act_browse()), this, SLOT(browseFile()), Qt::BlockingQueuedConnection);
}

void ImportDialog::browseFile()
{
    QFileDialog dialog(this);
    dialog.setFileMode(QFileDialog::AnyFile);
    QStringList filters;
    filters << "GymNet-Export (*.xml)";
    dialog.setNameFilters(filters);
    dialog.setViewMode(QFileDialog::Detail);
    dialog.setAcceptMode(QFileDialog::AcceptSave);
    dialog.setDefaultSuffix("xml");
    if(dialog.exec()) {

    }
}

void ImportDialog::act_browse()
{
}

void ImportDialog::parseXml()
{
}
