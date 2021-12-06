#ifndef INDIVIDUALDIALOG_H
#define INDIVIDUALDIALOG_H

#include <QDialog>

namespace Ui {
    class IndividualDialog;
}

class Athlete;
class Event;
class EntityManager;

class IndividualDialog : public QDialog {
    Q_OBJECT

public:
    IndividualDialog(Event *tfEvent, EntityManager *em, int edit=0, QWidget* parent = nullptr);
    ~IndividualDialog();

private slots:
    void initData();
    void save();
    void checkUpdate();
    void checkDisziplinen();
    void checkJg();
    void changeDat();
    void addClub();

private:
    QList< Athlete* > m_athletes;
    Event *m_event;
    EntityManager *m_em;
    Ui::IndividualDialog *ui;
    int editid;
};

#endif
