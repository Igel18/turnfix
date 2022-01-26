#include "itchecksquads.h"
#include "model/entitymanager.h"
#include "model/entity/event.h"
#include "src/global/header/_global.h"

void ITCheckSquads::print( QPrinter *printer ) {
    setTypeString( "EDV-Checkliste" );
    Print::print( printer );
    printHeadFoot();
    printContent();
}

void ITCheckSquads::printContent() {
    auto db = QSqlDatabase::database( m_em->connectionName() );
    QSqlQuery query( db );
    query.prepare("SELECT int_durchgang, var_riege FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND int_runde=? GROUP BY var_riege, int_durchgang ORDER BY int_durchgang, var_riege");
    query.bindValue( 0, m_event->mainEvent()->id() );
    query.bindValue( 1, m_event->round() );
    query.exec();

    int lastdurchgang;
    QList<int> lastdis;

    while( query.next() ) {
        if( ( max_yco - m_yco - mmToPixel( 6.0 ) ) < 0 ) {
            newPage();
            lastdis.clear();
        }

        if( query.value(0).toInt() != lastdurchgang ) {
            lastdurchgang = query.value(0).toInt();
            setPrinterFont( 14, true );
            if (query.at() > 0) {
                m_yco += mmToPixel( 6.6 );
            }
            painter.drawText( QRectF(pr.x(), m_yco, pr.width()-pr.x()-pr.x(), fontHeight ), query.value(0).toString() + ". Durchgang", QTextOption( Qt::AlignVCenter | Qt::AlignCenter ) );
            m_yco += mmToPixel(6.6);
            lastdis.clear();
        }

        QSqlQuery query2( db );
        query2.prepare("SELECT int_disziplinenid, var_kurz1 FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) INNER JOIN tfx_wettkaempfe_x_disziplinen USING (int_wettkaempfeid) INNER JOIN tfx_disziplinen USING (int_disziplinenid) WHERE int_veranstaltungenid=? AND int_runde=? AND var_riege=? GROUP BY var_kurz1, int_disziplinenid");
        query2.bindValue( 0, m_event->mainEvent()->id() );
        query2.bindValue( 1, m_event->round());
        query2.bindValue( 2, query.value(1).toString() );
        query2.exec();
        int rowcount = _global::querySize(query2);

        QList<int> checkdis;
        while (query2.next()){
            checkdis.append(query2.value(0).toInt());
        }

        if (checkdis != lastdis) {
            lastdis = checkdis;
            setPrinterFont( 10 );
            painter.drawLine( QPointF(pr.x()+mmToPixel(23.8),m_yco),QPointF(pr.x()+mmToPixel(23.8) + rowcount * mmToPixel(13.2), m_yco ) );
            painter.drawLine( QPointF(pr.x()+mmToPixel(35)+rowcount*mmToPixel(13.2),m_yco),QPointF(pr.x()+mmToPixel(35)+rowcount*mmToPixel(13.2)+mmToPixel(35),m_yco));
            m_yco += mmToPixel( 0.5 );

            for( int i = 0; i < rowcount; ++i ) {
                query2.seek(i);
                painter.drawLine(QPointF(pr.x()+mmToPixel(23.8)+(i*mmToPixel(13.2)), m_yco - mmToPixel(0.5)), QPointF(pr.x()+mmToPixel(23.8)+(i*mmToPixel(13.2)),m_yco-mmToPixel(0.5)+mmToPixel(5.0)));
                painter.drawText(QRectF(pr.x()+mmToPixel(23.8)+(i*mmToPixel(13.2)), m_yco, mmToPixel(13.2), QFontMetricsF(painter.font()).height()),query2.value(1).toString(),QTextOption(Qt::AlignVCenter | Qt::AlignCenter));
            }

            painter.drawLine(QPointF(pr.x()+mmToPixel(23.8)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)),QPointF(pr.x()+mmToPixel(23.8)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)+mmToPixel(5.0)));
            painter.drawLine(QPointF(pr.x()+mmToPixel(35)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)),QPointF(pr.x()+mmToPixel(35)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)+mmToPixel(5.0)));
            painter.drawLine(QPointF(pr.x()+mmToPixel(70.0)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)),QPointF(pr.x()+mmToPixel(70)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)+mmToPixel(5.0)));
            painter.drawText(QRectF(pr.x()+mmToPixel(35)+(rowcount*mmToPixel(13.2)), m_yco, mmToPixel(35), QFontMetricsF(painter.font()).height()),"Wettkämpfe",QTextOption(Qt::AlignVCenter | Qt::AlignCenter));
            m_yco += mmToPixel(4.5);
            painter.drawLine(QPointF(pr.x() , m_yco ),QPointF(pr.x()+rowcount*mmToPixel(13.2)+mmToPixel(23.8) , m_yco ));
            painter.drawLine(QPointF(pr.x()+mmToPixel(35)+rowcount*mmToPixel(13.2) , m_yco ),QPointF(pr.x()+mmToPixel(35)+rowcount*mmToPixel(13.2)+mmToPixel(35) , m_yco ));
        }
        painter.drawLine(QPointF(pr.x() , m_yco ),QPointF(pr.x() , m_yco +mmToPixel(5.0)));
        for (int i=0;i<rowcount;i++) {
            painter.drawLine(QPointF(pr.x()+mmToPixel(23.8)+(i*mmToPixel(13.2)) , m_yco ),QPointF(pr.x()+mmToPixel(23.8)+(i*mmToPixel(13.2)) , m_yco +mmToPixel(5.0)));
        }
        painter.drawLine(QPointF(pr.x()+mmToPixel(23.8)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)),QPointF(pr.x()+mmToPixel(23.8)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)+mmToPixel(5.0)));
        painter.drawLine(QPointF(pr.x()+mmToPixel(35)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)),QPointF(pr.x()+mmToPixel(35)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)+mmToPixel(5.0)));
        painter.drawLine(QPointF(pr.x()+mmToPixel(70)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)),QPointF(pr.x()+mmToPixel(70)+(rowcount*mmToPixel(13.2)) , m_yco -mmToPixel(0.5)+mmToPixel(5.0)));
        m_yco += mmToPixel(0.5);
        painter.drawText(QRectF(pr.x()+mmToPixel(1.3), m_yco, mmToPixel(35), QFontMetricsF(painter.font()).height()),"Riege " + query.value(1).toString(),QTextOption(Qt::AlignVCenter));

        QSqlQuery query3( db );
        query3.prepare("SELECT var_nummer FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND int_runde=? AND var_riege=? GROUP BY var_nummer ORDER BY var_nummer");
        query3.bindValue( 0, m_event->mainEvent()->id() );
        query3.bindValue( 1, m_event->round());
        query3.bindValue( 2, query.value(1).toString());
        query3.exec();
        QString wks;
        int wkcount = _global::querySize(query3);
        while (query3.next()) {
            wks = wks + query3.value(0).toString();
            if (query3.at() < wkcount-1) wks = wks + ", ";
        }
        painter.drawText(QRectF(pr.x()+mmToPixel(35)+(rowcount*mmToPixel(13.2)), m_yco, mmToPixel(35), QFontMetricsF(painter.font()).height()),wks,QTextOption(Qt::AlignVCenter | Qt::AlignCenter));
        m_yco += mmToPixel(4.5);
        painter.drawLine(QPointF(pr.x() , m_yco ),QPointF(pr.x()+rowcount*mmToPixel(13.2)+mmToPixel(35) , m_yco ));
        painter.drawLine(QPointF(pr.x()+mmToPixel(35)+rowcount*mmToPixel(13.2) , m_yco ),QPointF(pr.x()+mmToPixel(35)+rowcount*mmToPixel(13.2)+mmToPixel(35) , m_yco ));
    }

    finishPrint();
}
