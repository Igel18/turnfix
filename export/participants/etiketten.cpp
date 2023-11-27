#include "etiketten.h"
#include "model/entitymanager.h"
#include "model/entity/event.h"
#include "participants/participantsmodel.h"
#include "model/entity/competition.h"
#include "model/repository/competitionrepository.h"

void Etiketten::print(QPrinter *printer) {
    Print::print(printer);
    printHeadFoot();
    printContent();
}

/*
 * This is to print labels of the participants in format
 *  paper:  DIN-A4
 *  count:  4 x 16
 *  each:   48,5mm x 16,9mm
 */
void Etiketten::printContent() {

    auto competitions = m_em->competitionRepository()->fetchByEvent(m_event);
    auto participantCount=0;

    QList<QStringList> paricipantlist;

    // read the participants from all competitions of this event
    foreach (auto comp, competitions) {

        for (int i=0; i < comp->event()->participantsModel()->rowCount(); ++i ) {
            if (comp->event()->participantsModel()->data(i,5) == comp->number()) {
                participantCount++;

                auto participant = comp->event()->participantsModel();
                auto name = participant->data(i,1);
                auto jg = participant->data(i,2);
                auto verein = participant->data(i,4);
                auto wkNr = participant->data(i,5);
                auto riege = participant->data(i,6);

                QStringList data;
                data.append(name.toString());
                data.append(jg.toString());
                data.append(verein.toString());
                data.append(wkNr.toString());
                data.append(riege.toString());
                paricipantlist.append(data);
            }
        }
    }

    //set label values
    // keine ahnung warum die originalen werte der labels nicht passen. darum wurden diese angepasst. vermutung: das mmToPixel stimmt nicht.
    auto labelheigth = 17.9;//16.9;
    auto labelwidth = 50.5;//48.5;
    auto boarderleft = 7.0;
    auto boardertop = 13.0;

    // es gibt 4 labels in einer zeile
    auto labelcountX = 4;

    // es gibt 16 labels in einer spalte
    auto labelcountY = 16;

    auto count=0;

    // Seiten schleife
    while (count < participantCount) {

        // Zeilen schleife
        for(int i=0; i<labelcountX; i++){

            // Spalten schleife
            // die 1. Zeile ist immer mit dem Header überdeckt, daher fange ich erst in der 2. zeile an.
            for(int j=1; j<labelcountY; j++){
                QStringList part = paricipantlist[count];
                drawLabel(i, j, labelheigth, labelwidth, boarderleft, boardertop,  part[0], part[1], part[2], part[3], part[4]);
                count++;
                if(count >= participantCount){
                    break;
                }
            }
            if(count >= participantCount){
                break;
            }
        }

        // sonst wird nochmal eine leere seite erstellt
        if(count < participantCount){
            newPage();
        }
    }

    finishPrint();
}

/*
 * x ist die position des labels von oben nach unten
 * y ist die position des labels von links nach rechts
 * height ist die höhe eines labels in mm
 * width ist die breite eines labels in mm
 * boarderleft ist die rahmenbreite links bis das 1. label los geht in mm
 * boardertop ist die rahmenbreite oben bis das 1. label los geht in mm
 */
void Etiketten::drawLabel(int x, int y, double height, double width, double boarderleft, double boardertop, QString name, QString jg, QString verein, QString wettkampf, QString riege){

    //die position von links
    auto positionX = (x * width) + boarderleft;

    // die position von oben
    auto positionY = (y * height) + boardertop;

    m_yco = mmToPixel(positionY);
    painter.drawText(QRectF(mmToPixel(positionX), m_yco, mmToPixel(positionY), fontHeight), name, QTextOption(Qt::AlignLeft));
    m_yco += fontHeight+mmToPixel(1.0);
    painter.drawText(QRectF(mmToPixel(positionX), m_yco, mmToPixel(positionY), fontHeight), verein,QTextOption(Qt::AlignLeft));
    m_yco += fontHeight+mmToPixel(1.0);
    painter.drawText(QRectF(mmToPixel(positionX), m_yco, mmToPixel(positionY), fontHeight), "RG: " + riege + " WK: " + wettkampf, QTextOption(Qt::AlignLeft));
    m_yco += fontHeight+mmToPixel(1.0);
}

QList<QStringList> Etiketten::readParticipants(){
    auto competitions = m_em->competitionRepository()->fetchByEvent(m_event);
    auto participantCount=0;
    QList<QStringList> paricipantlist;

    // read the participants from all competitions of this event
    foreach (auto comp, competitions) {

        for (int i=0; i < comp->event()->participantsModel()->rowCount(); ++i ) {
            if (comp->event()->participantsModel()->data(i,5) == comp->number()) {
                participantCount++;

                auto participant = comp->event()->participantsModel();
                auto name = participant->data(i,1);
                auto jg = participant->data(i,2);
                auto verein = participant->data(i,4);
                auto wkNr = participant->data(i,5);
                auto riege = participant->data(i,6);

                QStringList data;
                data.append(name.toString());
                data.append(jg.toString());
                data.append(verein.toString());
                data.append(wkNr.toString());
                data.append(riege.toString());
                paricipantlist.append(data);
            }
        }
    }
}
