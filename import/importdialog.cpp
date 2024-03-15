#include "importdialog.h"
#include <QFileDialog>
#include <QDialog>
#include <QActionGroup>
#include <QMessageBox>
#include <QXmlStreamReader>
#include "ui_importdialog.h"
#include <QTextCodec>
#include <QDomDocument>

#include <QDebug>

ImportDialog::ImportDialog(Event *event, EntityManager *em, QWidget *parent)
    : QDialog(parent)
    , ui(new Ui::ImportDialog)
    , m_event(event)
    , m_em(em)
{
    ui->setupUi(this);
    connect(ui->FileOpenDlg, SIGNAL(clicked()), this, SLOT(browseFile()));
}

void ImportDialog::browseFile()
{
    //QFile file()
    QFileDialog dialog(this);
    dialog.setFileMode(QFileDialog::AnyFile);
    QStringList filters;
    filters << "GymNet-Export (*.xml)";
    dialog.setNameFilters(filters);
    dialog.setViewMode(QFileDialog::Detail);
    dialog.setAcceptMode(QFileDialog::AcceptOpen);
    dialog.setDefaultSuffix("xml");
    if(dialog.exec()) {
        filename = dialog.selectedFiles()[0];
    }


    ImportDialog::parseXml();

    //listWidget.text();
}

void ImportDialog::parseXml2()
{
    QFile xmlFile(filename);
    if (!xmlFile.open(QIODevice::ReadOnly | QFile::Text))
    {
        qDebug()<<"File Openning Error"<< xmlFile.errorString();
        return;
    }

    QDomDocument xmlReader;
    xmlReader.setContent(&xmlFile);

    QDomElement topElement = xmlReader.documentElement();
    QDomNode domNode = topElement.firstChild();

 //   qDebug() << domNode.EncodingFromTextStream;

    while(!domNode.isNull())
    {
        QDomElement domElement = domNode.toElement();

        if(!domElement.isNull()){

            if (domElement.tagName() == "Wettkämpfe")
            {
                qDebug() << domElement.tagName();
                qDebug() << domElement.text();
            }

            if (domElement.tagName() == "Wettkampf")
            {
                qDebug() << domElement.tagName();
                qDebug() << domElement.text();
            }

            if (domElement.tagName() == "perName")
            {
                qDebug() << domElement.tagName();
                qDebug() << domElement.text();
            }
        }

        domNode = domNode.nextSibling();
    }
}

void ImportDialog::parseXml()
{
    QFile xmlFile(filename);

    if (!xmlFile.open(QIODevice::ReadOnly | QFile::Text))
    {
        qDebug()<<"File Openning Error"<< xmlFile.errorString();
        return;
    }

    qDebug() << xmlFile;

    // Umweg über das ByteArray da sonderzeichen sonst nicht funktionieren
    QByteArray line;
    while (!xmlFile.atEnd()){
        line = xmlFile.readAll();
        qDebug() << line;
    }

    qDebug() << QString::fromUtf8(line);

    QString ttt = QString::fromUtf8(line);
    qDebug() << ttt;

    QXmlStreamReader xmlReader(line);
    while(!xmlReader.atEnd() &&  !xmlReader.hasError()) {
        /* Read next element.*/
        QXmlStreamReader::TokenType token = xmlReader.readNext();
        /* If token is just StartDocument, we'll go to next.*/

        switch (token) {
        case QXmlStreamReader::StartDocument:
            qDebug() << xmlReader.documentEncoding();
        case QXmlStreamReader::NoToken:
            break;
        case QXmlStreamReader::Invalid: {
            qDebug() << xmlReader.tokenString();  // never seen
            break;
        }
        case QXmlStreamReader::Characters:   {
            qDebug() << xmlReader.tokenString() << xmlReader.text();
            break;
        }
        case QXmlStreamReader::StartElement: {
            qDebug() << xmlReader.tokenString() << xmlReader.qualifiedName();
            for (QXmlStreamAttribute &attr: xmlReader.attributes()) {
                qDebug() << " " << attr.name() << "==" << attr.value();
            }

            if(xmlReader.name() == "Wettk\xC3\xA4mpfe") {
                continue;
            }

            break;
        }
        case QXmlStreamReader::EndElement:   {
            qDebug() << xmlReader.tokenString() << xmlReader.qualifiedName();
            break;
        }
        default: {
            qDebug() << xmlReader.tokenString();
            break;
        }
        }


//        if(token == QXmlStreamReader::StartDocument) {
//            continue;
//        }
//        /* If token is StartElement, we'll see if we can read it.*/
//        if(token == QXmlStreamReader::StartElement) {

//            qDebug() << m_xmlData.name();

//            /* If it's named persons, we'll go to the next.*/
//            if(m_xmlData.name() == "Wettkämpfe") {
//                continue;
//            }
//            /* If it's named person, we'll dig the information from there.*/
//            if(m_xmlData.name() == "Qu") {
//               // persons.append(this->parsePerson(xml));
//            }
//        }
    }
}

