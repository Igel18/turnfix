#include "app/logindialog.h"
#include "app/mainwindow.h"
#include "model/entity/athlete.h"
#include "model/entitymanager.h"
#include <QApplication>
#include <QTranslator>

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    app.setOrganizationName("TurnFix");
    app.setApplicationName("TurnFix");

    QTranslator translator;
    translator.load("qt_de.qm", ":/translations/");
    app.installTranslator(&translator);

    EntityManager em;

    auto pLogingDlg = new LoginDialog(&em);

    if (pLogingDlg->exec() != 1) {
        return 0;
    } else {
        MainWindow mw(&em, pLogingDlg->selectedEvent());
        pLogingDlg->setParent(&mw);
        mw.show();
        return app.exec();
    }
}
