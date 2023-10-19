#ifndef SELECTCOMPETITIONDIALOG_H
#define SELECTCOMPETITIONDIALOG_H
#include <QDialog>
#include "model/entitymanager.h"
#include "model/entity/event.h"

namespace Ui {
class SelectCompetitionDialog;
}

class Event;
class EntityManger;

class SelectCompetitionDialog : public QDialog
{
    Q_OBJECT

public:
    explicit SelectCompetitionDialog(Event *Event, EntityManager *em, QWidget *parent = nullptr);
    ~SelectCompetitionDialog();

public slots:
    QString getWk();

private slots:
    void initData();
    void select1();

private:
    Ui::SelectCompetitionDialog *ui;
    Event *m_event;
    EntityManager *m_em;
    QString wk;
};
#endif
