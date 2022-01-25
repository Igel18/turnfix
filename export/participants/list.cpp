#include "list.h"
#include "model/entity/competition.h"
#include "model/entitymanager.h"
#include "model/repository/competitionrepository.h"
#include "src/global/header/_global.h"

void List::print(QPrinter *printer) {
    Print::print(printer);
    printHeadFoot();
    printContent();
}

void List::printSubHeader() {
    auto competition = m_em->competitionRepository()->fetchByNumber( m_event, currWK );

    setPrinterFont(10);
    QString jg = "";

    if (competition->type() == 0)
        jg = "Jg.";

    if (competition->type() == 0 || competition->type() == 2) {
        drawStandardRow("StNr.","Name",jg,"Verein","",readDetailInfo(true));
    } else {
        drawStandardRow("StNr.","Name","Jg.","Mannschaft","",readDetailInfo(true));
    }
    painter.drawLine(QPointF(pr.x(), m_yco),QPointF(pr.width()-pr.x(),m_yco));
    m_yco += 1;
}

bool List::checkWKChange(QString currWK, QString lastWK, double lineHeight, bool newPageCreated) {
    int skip=0;
    if (lastWK != currWK) {
        skip += mmToPixel(27.8);
    }
    skip += mmToPixel(lineHeight);
    if (m_yco+skip > max_yco) {
        newPage();
        newPageCreated = true;
        if (lastWK == currWK) printDescriptor(currWK,1);
    }
    if (lastWK != currWK) {
        if (lastWK != "" && !newPageCreated) m_yco += mmToPixel(5.0);
        printDescriptor(currWK);
    }
    return newPageCreated;
}
