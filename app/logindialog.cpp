#include "logindialog.h"
#include "checkdatabasedialog.h"
#include "connectionmodel.h"
#include "eventdialog.h"
#include "eventmodel.h"
#include "model/entity/abstractconnection.h"
#include "model/entity/event.h"
#include "model/entitymanager.h"
#include "postgressetupwizard.h"
#include "ui_logindialog.h"
#include <QDataWidgetMapper>
#include <QFileDialog>
#include <QMenu>
#include <QMessageBox>
#include <QXmlStreamReader>
#include <QDomDocument>
#include <QtDebug>
#include <QListIterator>

LoginDialog::LoginDialog(EntityManager *em, QWidget *parent)
    : QDialog(parent)
    , ui(new Ui::LoginDialog)
    , connectionModel(new ConnectionModel(em, this))
    , em(em)
    , eventModel(new EventModel(em, this))
{
    ui->setupUi(this);

    ui->selectionBarWidget->addButton(ui->loginAction);
    ui->selectionBarWidget->addButton(ui->settingsAction);
    ui->selectionBarWidget->selectFirstButton();

    ui->eventsTable->setModel(eventModel);
    ui->eventsTable->horizontalHeader()->setSectionResizeMode(0, QHeaderView::ResizeToContents);
    ui->eventsTable->horizontalHeader()->setSectionResizeMode(1, QHeaderView::Stretch);
    ui->eventsTable->horizontalHeader()->setSectionResizeMode(2, QHeaderView::Stretch);

    mapper = new QDataWidgetMapper(this);
    mapper->setModel(connectionModel);
    mapper->addMapping(ui->postgresNameText, 0);
    mapper->addMapping(ui->databaseServerText, 1);
    mapper->addMapping(ui->databaseUserText, 2);
    mapper->addMapping(ui->databasePasswordText, 3);
    mapper->addMapping(ui->databaseText, 4);
    mapper->addMapping(ui->sqliteNameText, 0);
    mapper->addMapping(ui->databaseFileText, 1);

    ui->connectionComboBox->setModel(connectionModel);
    ui->connectionListView->setModel(connectionModel);

    auto connectionMenu = new QMenu(ui->addConnectionButton);
    connectionMenu->addAction("SQLite", connectionModel, [this]() {
        connectionModel->addConnection(AbstractConnection::Type::SQLite);
    });
    connectionMenu->addAction("PostgreSQL", connectionModel, [this]() {
        connectionModel->addConnection(AbstractConnection::Type::PostgreSQL);
    });
    ui->addConnectionButton->setMenu(connectionMenu);

    connect(ui->selectionBarWidget,
            &TFSelectionBar::currentTabChanged,
            ui->mainStack,
            &QStackedWidget::setCurrentIndex);
    connect(ui->loginButton, &QPushButton::clicked, this, &LoginDialog::doLogin);
    connect(ui->checkDatabaseButton, &QPushButton::clicked, this, &LoginDialog::checkDatabase);
    connect(ui->eventsTable, &QTableView::doubleClicked, this, &LoginDialog::selectCurrentEvent);
    connect(ui->createEventButton, &QPushButton::clicked, this, &LoginDialog::createEvent);
    connect(ui->importEventButton, &QPushButton::clicked, this, &LoginDialog::importEvent);
    connect(ui->selectEventButton, &QPushButton::clicked, this, &LoginDialog::selectCurrentEvent);
    connect(ui->removeConnectionButton, &QPushButton::clicked, connectionModel, [this]() {
        connectionModel->removeConnection(ui->connectionListView->currentIndex());
    });
    connect(ui->connectionListView->selectionModel(),
            &QItemSelectionModel::selectionChanged,
            this,
            &LoginDialog::connectionListSelectionChanged);
    connect(ui->databaseFileButton, &QToolButton::clicked, this, &LoginDialog::openDatabaseFile);
    connect(ui->databaseCreateButton, &QToolButton::clicked, this, &LoginDialog::createDatabaseFile);
    connect(ui->databaseAssistantButton,
            &QPushButton::clicked,
            this,
            &LoginDialog::setupPostgresDatabase);
}

LoginDialog::~LoginDialog()
{
    delete ui;
}

Event *LoginDialog::selectedEvent()
{
    return m_selectedEvent;
}

void LoginDialog::doLogin()
{
    bool connectionEstablished;

    ui->eventsWidget->setEnabled(false);
    eventModel->clear();

    if (ui->connectionComboBox->currentIndex()==-1)
       return;

    AbstractConnection *connection = connectionModel->connectionAt(
        ui->connectionComboBox->currentIndex());

    connect(connection, &AbstractConnection::errorOccured, this, &LoginDialog::errorHandler);

    connectionEstablished = connection->connect("main");

    if (connectionEstablished) {
        em->setConnectionName("main");
        ui->eventsWidget->setEnabled(true);
        eventModel->getEvents();
    }

    disconnect(connection, &AbstractConnection::errorOccured, this, &LoginDialog::errorHandler);
}

void LoginDialog::errorHandler(const QString &errorText)
{
    QMessageBox::critical(this,tr("Datenbankfehler"),tr("Es ist ein Fehler bei der Kommunikation mit der Datenbank aufgetreten.\n\nFehlerbeschreibung:\n%1").arg(errorText));
}

void LoginDialog::checkDatabase()
{
    auto index = ui->connectionListView->currentIndex();
    if (!index.isValid()) {
        return;
    }

    AbstractConnection *connection = connectionModel->connectionAt(index);

    CheckDatabaseDialog dialog(connection);
    dialog.exec();
}

void LoginDialog::createEvent()
{
    auto *nwkw = new EventDialog(new Event, em, this);
    if (nwkw->exec() == 1) {
        eventModel->getEvents();
    }
}

void LoginDialog::importEvent()
{
    auto filename = QFileDialog::getOpenFileName(this, tr("GymNet (*.xml)"));
    QFile queryFile(filename);

    QDomDocument xmlBOM;
    xmlBOM.setContent(&queryFile);

    // createEvent();
    readGymNetXml(&xmlBOM);

    queryFile.close();
}

void LoginDialog::readGymNetXml(QDomDocument *xmlBOM)
{
    auto wettkaempfeNode=xmlBOM->documentElement();
    //QDomElement wettkaempfeNode=root.firstChild().toElement();
    qDebug() << wettkaempfeNode.tagName();

    if(wettkaempfeNode.tagName()=="Wettkämpfe")
    {
        for(int i = 0; i < wettkaempfeNode.childNodes().count(); i++)
        {
            QDomElement wettkampfNode = wettkaempfeNode.childNodes().at(i).toElement();
            qDebug() << wettkampfNode.tagName();

            QString wettkampfBezeichnung;
            QString wettkampfAlterMin;
            QString wettkampfAlterMax;

            for(int j = 0; j < wettkampfNode.childNodes().count(); j++)
            {
                QDomElement wettkampfChildNodes = wettkampfNode.childNodes().at(j).toElement();
                qDebug() << wettkampfChildNodes.tagName();
                if(wettkampfChildNodes.tagName()=="waBezeichnung")
                {
                    wettkampfBezeichnung = wettkampfChildNodes.text();
                }
                else if (wettkampfChildNodes.tagName()=="waAlterMin")
                {
                    wettkampfAlterMin = wettkampfChildNodes.text();
                }
                else if (wettkampfChildNodes.tagName()=="waAlterMax")
                {
                    wettkampfAlterMax = wettkampfChildNodes.text();
                }
                else if (wettkampfChildNodes.tagName()=="Mannschaften")
                {
                    for(int k = 0; k < wettkampfChildNodes.childNodes().count(); k++)
                    {
                        QDomElement mannschaftenNode = wettkampfChildNodes.childNodes().at(k).toElement();
                        qDebug() << mannschaftenNode.tagName();

                        if(mannschaftenNode.tagName()=="Mannschaft")
                        {
                            for(int l = 0; l < mannschaftenNode.childNodes().count(); l++)
                            {
                                QDomElement mannschaftNode = mannschaftenNode.childNodes().at(l).toElement();
                                qDebug() << mannschaftNode.tagName();

                                if (mannschaftNode.tagName()=="verKurzname")
                                {
                                    qDebug() << mannschaftNode.text();
                                    qDebug() << "schreibe Verein in DB";
                                }
                                else if (mannschaftNode.tagName()=="Teilnehmer")
                                {
                                    for(int m = 0; m < mannschaftNode.childNodes().count(); m++)
                                    {
                                        QDomElement teilnehmerNode = mannschaftNode.childNodes().at(m).toElement();
                                        qDebug() << teilnehmerNode.tagName();

                                        if(teilnehmerNode.tagName()=="TN")
                                        {
                                            QString teilnehmerName;
                                            QString teilnehmerVorname;
                                            QString teilnehmberGeburtstag;
                                            QString teilnehmerGeschlecht;
                                            for(int n = 0; n < teilnehmerNode.childNodes().count(); n++)
                                            {
                                                QDomElement teilnehmer = teilnehmerNode.childNodes().at(n).toElement();
                                                qDebug() << teilnehmer.tagName();

                                                if(teilnehmer.tagName()=="perName")
                                                {
                                                    teilnehmerName = teilnehmer.text();
                                                }
                                                else if (teilnehmer.tagName()=="perVorname")
                                                {
                                                    teilnehmerVorname = teilnehmer.text();
                                                }
                                                else if (teilnehmer.tagName()=="perGeburt")
                                                {
                                                    teilnehmberGeburtstag = teilnehmer.text();
                                                }
                                                else if (teilnehmer.tagName()=="perGeschlecht")
                                                {
                                                    teilnehmerGeschlecht = teilnehmer.text();
                                                }
                                            }

                                            qDebug() << teilnehmerName;
                                            qDebug() << teilnehmerVorname;
                                            qDebug() << teilnehmberGeburtstag;
                                            qDebug() << teilnehmerGeschlecht;
                                            qDebug() << "schreibe Teilnehmer in DB";
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                qDebug() <<  wettkampfBezeichnung;
                qDebug() <<  wettkampfAlterMin;
                qDebug() <<  wettkampfAlterMax;
                qDebug() << "Wettkampf in DB schreiben";
            }
        }
    }
   // }

    //                         {auto competition in root.Descendants().Where(x => x.Name == "Wettkampf")
    //                             var name = competition.Element(XName.Get("waBezeichnung")).Value;
    //                             var number = competition.Element(XName.Get("waNr")).Value;
    //                             var alterMax = Int32.Parse(competition.Element(XName.Get("waAlterMax")).Value);
    //                             var alterMin = Int32.Parse(competition.Element(XName.Get("waAlterMin")).Value);
    //                             var bereich = Int32.Parse(competition.Element(XName.Get("waGeschlecht")).Value);

}

//QDateTime setDateFromString(QString dateString)
//{
// QDateTime dt;
//    QVariantList dateAsList = convertQDatetoList(dateString);
//    if(dateAsList.size()==3) {
//     QDate t(dateAsList.at(2).toInt(),
//                dateAsList.at(1).toInt(),
//                dateAsList.at(0).toInt());
//     dt.setDate(t);
//    }
//    else {
//     //date format is not valid,so setting the current date
//     dt = QDateTime::currentDateTime();
//    }
// return dt;
//}
//QVariantList convertQDatetoList(QString dateTime)
//{
//    QStringList tempList = dateTime.split("/");
//    QVariantList dateList;
//    QListIterator i(tempList);
//    while(i.hasNext()) {
//     dateList.append(i.next());
//    }
//    return dateList;
//}
void LoginDialog::selectCurrentEvent()
{
    if (!ui->eventsTable->currentIndex().isValid())
        return;

    int row = ui->eventsTable->currentIndex().row();
    m_selectedEvent = eventModel->getEventFromRow(row);

    done(1);
}

void LoginDialog::openDatabaseFile()
{
    QFileDialog dialog(this);
    dialog.setFileMode(QFileDialog::ExistingFile);
    dialog.setViewMode(QFileDialog::List);
    dialog.setAcceptMode(QFileDialog::AcceptOpen);
    dialog.setNameFilters(QStringList(tr("TurnFix-Datenbank-Dateien (*.tfdb)")));
    if (dialog.exec()) {
        if (dialog.selectedFiles().size() > 0) {
            connectionModel->setData(connectionModel->index(mapper->currentIndex(), 1),
                                     dialog.selectedFiles().first());
        }
    }
}

void LoginDialog::createDatabaseFile()
{
    QFileDialog dialog(this);
    dialog.setFileMode(QFileDialog::ExistingFile);
    dialog.setViewMode(QFileDialog::List);
    dialog.setAcceptMode(QFileDialog::AcceptSave);
    dialog.setNameFilters(QStringList(tr("TurnFix-Datenbank-Dateien (*.tfdb)")));
    if (dialog.exec()) {
        if (dialog.selectedFiles().size() > 0) {
            connectionModel->setData(connectionModel->index(mapper->currentIndex(), 1),
                                     dialog.selectedFiles().first());
            //            db = DB::getInstance();
            //            fileName = dialog.selectedFiles().first();

            //            if (fileName.right(5) != ".tfdb")
            //                fileName += ".tfdb";

            //            // ui->databaseFileText->setText(fileName);
            //            this->saveData();
            //            db->establishConnection();
            //            CheckDatabaseDialog checker;
            //            checker.exec();
            //            db->closeConnection();
        }
    }
}

void LoginDialog::setupPostgresDatabase()
{
    PostgresSetupWizard wiz;
    if (wiz.exec() == 1) {
        // this->loadData();
    }
}

void LoginDialog::connectionListSelectionChanged(const QItemSelection &selected,
                                                 const QItemSelection &)
{
    if (selected.indexes().length() == 0) {
        ui->connectionStackedWidget->setCurrentIndex(0);
        return;
    }

    auto index = selected.indexes().at(0);
    auto *connection = connectionModel->connectionAt(index);
    QString className = connection->metaObject()->className();

    mapper->setCurrentModelIndex(index);

    if (className == "SQLiteConnection") {
        ui->connectionStackedWidget->setCurrentIndex(1);
    } else if (className == "PostgreSQLConnection") {
        ui->connectionStackedWidget->setCurrentIndex(2);
    } else {
        ui->connectionStackedWidget->setCurrentIndex(0);
    }
}
