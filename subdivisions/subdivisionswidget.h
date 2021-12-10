#ifndef SUBDIVISIONSWIDGET_H
#define SUBDIVISIONSWIDGET_H
#include <QWidget>

namespace Ui {
class SubdivisionsWidget;
}

class EntityManager;
class Event;
class QStandardItemModel;
class QTableView;

class SubdivisionsWidget : public QWidget
{
    Q_OBJECT

public:
    explicit SubdivisionsWidget(QWidget *parent = nullptr);
    ~SubdivisionsWidget();

    void setup(Event *event, EntityManager *em);

public slots:
    void reloadSquads();

private slots:
    void addNewSquad();
    void removeSquad();
    void addToSquad();
    void removeFromSquad();
    void updateSquadName();
    void fetchRgData();

protected:
    void setSquadNameForSelected( QTableView* pTableView, QString squadName );

private:
    Event *m_event;
    EntityManager *m_em;
    Ui::SubdivisionsWidget *ui;
    QStandardItemModel *rg_model;
    const int m_iSquadColIdx = 6;
};

#endif
