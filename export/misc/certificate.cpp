#include "certificate.h"
#include "model/objects/competition.h"
#include "src/global/header/_global.h"
#include "src/global/header/result_calc.h"

bool Certificate::eineUrkunde = false;
bool Certificate::rundenErgebnisse = false;
bool Certificate::platzWertung = false;
bool Certificate::einzelErgebnis = false;
int Certificate::urkundenID = 0;

void Certificate::print(QPrinter *printer) {
    Print::print(printer);
    printContent();
}

void Certificate::printContent() {
    Competition *competition = Competition::getByNumber(this->event, selectedTNWK);

    QList<QStringList> rlist;
    QSqlQuery wkdata;
    wkdata.prepare("SELECT tfx_veranstaltungen.var_name, to_char(dat_von, 'dd.mm.yyyy'), to_char(dat_bis, 'dd.mm.yyyy'), tfx_wettkampforte.var_name, var_ort, tfx_wettkaempfe.var_name, tfx_wettkaempfe.var_nummer, tfx_gaue.var_name, tfx_verbaende.var_name, tfx_laender.var_name FROM tfx_veranstaltungen INNER JOIN tfx_wettkampforte USING (int_wettkampforteid) INNER JOIN tfx_wettkaempfe USING (int_veranstaltungenid)WHERE tfx_veranstaltungen.int_veranstaltungenid=? AND tfx_wettkaempfe.var_nummer=?");
    wkdata.bindValue(0, this->event->getMainEventId());
    wkdata.bindValue(1, competition->getNumber());
    wkdata.exec();
    wkdata.next();
    if (competition->getType() == 1 && rundenErgebnisse) {
        rlist = Result_Calc::roundResultArrayNew(competition, platzWertung);
    } else {
        int typ = competition->getType();
        if (einzelErgebnis) typ = 0;
        rlist = Result_Calc::resultArrayNew(competition);
    }
    rlist = Result_Calc::sortRes(rlist);
    for (int i=(rlist.size()-1);i>=0;i--) {
        if (!teilnehmerNumbers.contains(rlist.at(i).last().toInt()) && !einzelErgebnis) {
            rlist.removeAt(i);
        }
    }

    for (int r=0;r<rlist.size();r++) {
        int numOfUrkunden = 1;
        if (competition->getType() == 1 && !eineUrkunde && !einzelErgebnis) {
            QSqlQuery teamCount;
            teamCount.prepare("SELECT COUNT(*) FROM tfx_man_x_teilnehmer WHERE int_mannschaftenid=? AND int_runde=?");
            teamCount.bindValue(0,rlist.at(r).last().toInt());
            teamCount.bindValue(1, this->event->getRound());
            teamCount.exec();
            teamCount.next();
            numOfUrkunden = teamCount.value(0).toInt();
        }
        for (int i=0;i<numOfUrkunden;i++) {
            printCustomPage(1,urkundenID,rlist.at(r),selectedTNWK);
            if (!(r==rlist.size()-1 && i==numOfUrkunden-1)) newPage(false);
        }
    }
    finishPrint();
}

void Certificate::setEineUrkunde(bool set) {
    eineUrkunde = set;
}

void Certificate::setRundenErgebnisse(bool set) {
    rundenErgebnisse = set;
}

void Certificate::setPlatzWertung(bool set) {
    platzWertung = set;
}

void Certificate::setEinzelErgebnis(bool set) {
    einzelErgebnis = set;
}

void Certificate::setUrkundenID(int set) {
    urkundenID = set;
}

bool Certificate::getRundenErgebnisse() {
    return rundenErgebnisse;
}