#include "gymnetimporter.h"
#include <QtDebug>

GymNetImporter::GymNetImporter()
{

}

void GymNetImporter::readGymNetXml(QDomDocument *xmlBOM)
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
                                else if (mannschaftNode.tagName()=="Disziplinen")
                                {
                                    for(int n = 0; n < mannschaftNode.childNodes().count(); n++)
                                    {
                                        QDomElement disziplinenNode = mannschaftNode.childNodes().at(n).toElement();
                                        qDebug() << disziplinenNode.tagName();

                                        if(disziplinenNode.tagName()=="Disziplin")
                                        {
                                            readDisziplinen(&disziplinenNode);
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
}

void GymNetImporter::readDisziplinen(QDomElement *xml)
{
    QString disziplinNummer;
    QString disziplinName;
    QString disziplinPunkte;

    for(int o = 0; o < xml->childNodes().count(); o++)
    {
        QDomElement disziplinenNodes = xml->childNodes().at(o).toElement();

        if(disziplinenNodes.tagName()=="wedDisNr")
        {
            disziplinNummer = disziplinenNodes.text();
        }
        else if (disziplinenNodes.tagName()=="wedDisName")
        {
            disziplinName = disziplinenNodes.text();
        }
        else if(disziplinenNodes.tagName()=="wtdPunkte")
        {
           disziplinPunkte = disziplinenNodes.text();
        }

        qDebug() << "Schreibe/Update Disziplin in DB";
        qDebug() << disziplinNummer;
        qDebug() << disziplinName;
        qDebug() << disziplinPunkte;
    }
}

//void readMannschaft(QDomElement &xml)
//{

//}
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
