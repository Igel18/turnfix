#ifndef INDIVIDUALDIALOG_H
#define INDIVIDUALDIALOG_H

#include <QDialog>

namespace Ui {
    class IndividualDialog;
}

class Event;
class EntityManager;
class Score;

class IndividualDialog : public QDialog {
    Q_OBJECT

public:
    IndividualDialog(Event *tfEvent, EntityManager *em, Score* pScore = nullptr, QWidget* parent = nullptr);
    ~IndividualDialog();

private slots:
    void save();
    void updateAthleteInfo();
    void updateDisciplins();
    void checkJg();
    void addClub();

private:
    Ui::IndividualDialog *ui;
    Event *m_event;
    EntityManager *m_em;
    Score* m_pScore;
};

#endif
