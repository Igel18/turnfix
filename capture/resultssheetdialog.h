#ifndef RESULTSSHEETDIALOG_H
#define RESULTSSHEETDIALOG_H
#include <QDialog>
#include <QPointer>
#include <QSortFilterProxyModel>

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
    void updateSquadStatus(int oldIndex, int newIndex, QString text);
    void changeSquadDisciplineStatus( int index );
    void saveClose();
    void saveJuryMethod();

private:
    Ui::ResultsSheetDialog *ui;
    ResultsSheetTableModel *pe_model;
    QSortFilterProxyModel * m_sortFilterModel = nullptr;
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
