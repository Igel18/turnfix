#include "etiketten.h"
#include "model/entitymanager.h"
#include "model/entity/event.h"
#include "src/global/header/_global.h"

/*
 * This is to print labels of the participants in format
 *  paper:  DIN-A4
 *  count:  4 x 16
 *  each:   48,5mm x 16,9mm
 */
void Etiketten::printContent() {
    QSqlQuery query2( QSqlDatabase::database( m_em->connectionName() ) );
    query2.prepare("SELECT int_startnummer, CASE WHEN tfx_gruppen.int_gruppenid IS NULL THEN " + _global::nameFormat() + " || CASE WHEN bol_ak='true' THEN ' (AK)' ELSE '' END ELSE tfx_gruppen.var_name END, tfx_vereine.var_name, var_nummer, "+_global::date("dat_geburtstag",2)+" FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) LEFT JOIN tfx_teilnehmer ON tfx_wertungen.int_teilnehmerid = tfx_teilnehmer.int_teilnehmerid LEFT JOIN tfx_gruppen ON tfx_wertungen.int_gruppenid = tfx_gruppen.int_gruppenid INNER JOIN tfx_vereine ON tfx_vereine.int_vereineid = tfx_teilnehmer.int_vereineid OR tfx_vereine.int_vereineid = tfx_gruppen.int_vereineid WHERE int_veranstaltungenid=? AND int_runde=? AND bol_startet_nicht='false' ORDER BY var_nummer, "+_global::substring("tfx_vereine.var_name","int_start_ort+1")+", tfx_vereine.var_name, var_nachname, var_vorname");
    query2.bindValue( 0, m_event->mainEvent()->id() );
    query2.bindValue( 1, m_event->round());
    query2.exec();
    QString lastWK;
    while (query2.next()) {
        auto startnummer = query2.value(0).toString();
        auto name = query2.value(1).toString();
        auto club = query2.value(2).toString();

        currWK = query2.value(3).toString();
        checkWKChange( currWK, lastWK, 6.6 );

        auto jahrgang = query2.value(4).toString();
        auto tmp2 = query2.value(5).toString();
        auto tmp3 = query2.value(6).toString();
        auto tmp4 = query2.value(7).toString();

        setPrinterFont( 10 );
        painter.drawLine(QPointF(pr.width()-pr.x(),m_yco-mmToPixel(1.3)),QPointF(pr.width()-pr.x(),m_yco-mmToPixel(1.3)+mmToPixel(6.6)));
        painter.drawLine(QPointF(pr.width()-pr.x()-mmToPixel(5.8),m_yco-mmToPixel(1.3)),QPointF(pr.width()-pr.x()-mmToPixel(5.8),m_yco-mmToPixel(1.3)+mmToPixel(6.6)));
        drawRow(startnummer + "  " ,name, jahrgang, club, "", readDetailInfo(false,club));
        painter.drawLine(QPointF(pr.x(),m_yco),QPointF(pr.width()-pr.x(),m_yco));
        m_yco += mmToPixel(1.3);
        lastWK = query2.value(3).toString();
    }

    finishPrint();
}

void Etiketten::printSubHeader() {
//    List::printSubHeader();
//    m_yco -= fontHeight+mmToPixel(1.0)+1;
//    painter.drawText(QRectF((pr.width()-pr.x()-mmToPixel(5.3)), m_yco, mmToPixel(5.3), QFontMetricsF(painter.font()).height()),"Ok",QTextOption(Qt::AlignVCenter));
//    m_yco += fontHeight+mmToPixel(1.0)+1;
}

void Etiketten::drawRow(QString plst, QString name, QString jg, QString verein, QString points, QString extra) {
    painter.drawText(QRectF(pr.x(), m_yco, mmToPixel(10.6), fontHeight),plst,QTextOption(Qt::AlignVCenter));
    painter.drawText(QRectF(pr.x()+mmToPixel(10.6), m_yco, mmToPixel(79.4), fontHeight),name,QTextOption(Qt::AlignVCenter));
    painter.drawText(QRectF(pr.x()+mmToPixel(79.4), m_yco, mmToPixel(10.6), fontHeight),jg,QTextOption(Qt::AlignVCenter));
    painter.drawText(QRectF(pr.x()+mmToPixel(90.0), m_yco, mmToPixel(79.4), fontHeight),verein,QTextOption(Qt::AlignVCenter));
    painter.drawText(QRectF(pr.x()+mmToPixel(155.0), m_yco, mmToPixel(45.0), fontHeight),extra,QTextOption(Qt::AlignVCenter));
    painter.drawText(QRectF((pr.width()-pr.x()-mmToPixel(15.9)), m_yco, mmToPixel(15.9), fontHeight),points,QTextOption(Qt::AlignVCenter | Qt::AlignRight));
    m_yco += fontHeight+mmToPixel(1.0);
}

