#ifndef RESULTSSHEETDIALOG_H
#define RESULTSSHEETDIALOG_H
#include <QDialog>
#include <QPointer>

namespace Ui {
class ResultsSheetDialog;
}

class EntityManager;
class Event;
class ResultsSheetTableModel;
class SquadDiscipline;


class ResultsSheetDialog : public QDialog
{
    Q_OBJECT

public:
    ResultsSheetDialog(EntityManager* em, Event *m_event, QWidget *parent = nullptr);
    void init(QString riege, int geraet, bool kuer);

private slots:
    void fillPETable();
    void finishEdit();
    void changeSquadDisciplineStatus( int index );
    void saveClose();
    void saveJuryMethod();

private:
    Ui::ResultsSheetDialog *ui;
    ResultsSheetTableModel *pe_model;
    EntityManager* m_em;
    Event *m_event;
    void calc();
    QString riege;
    int geraet;
    bool kuer;
    bool berechnen;
    int versuche;
    QPointer< SquadDiscipline > m_pSquadDiscipline;
};

#endif
