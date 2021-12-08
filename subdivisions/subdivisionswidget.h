#ifndef SUBDIVISIONSWIDGET_H
#define SUBDIVISIONSWIDGET_H
#include <QWidget>

namespace Ui {
class SubdivisionsWidget;
}

//class AssignmentTableModel;
class EntityManager;
class Event;
class QStandardItemModel;

class SubdivisionsWidget : public QWidget
{
    Q_OBJECT

public:
    explicit SubdivisionsWidget(QWidget *parent = nullptr);
    ~SubdivisionsWidget() override;

    void setup(Event *event, EntityManager *em);

public slots:
    void reloadSquads();
//    void fillRETable2();

private slots:
    void sendData();
    void getData();
    void updateRiege();
    void addRiege();
    void fetchRgData();
    void setRiegenData();
    void removeRiege();

private:
    Event *m_event;
    EntityManager *m_em;
    Ui::SubdivisionsWidget *ui;
//    AssignmentTableModel *re_model;
//    AssignmentTableModel *re_model2;
    QStandardItemModel *rg_model;
};

#endif
