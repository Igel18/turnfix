#ifndef CAPTUREWIDGET_H
#define CAPTUREWIDGET_H
#include <QWidget>

namespace Ui {
class CaptureWidget;
}

class EntityManager;
class Event;
class QSqlQueryModel;
class QStandardItemModel;

class CaptureWidget : public QWidget
{
    Q_OBJECT

public:
    explicit CaptureWidget(QWidget *parent = nullptr);
    ~CaptureWidget();

    void setup(Event *event, EntityManager *em);

public slots:
    void squadChange(QString squad="");
    void reloadSquads();

private slots:
    void startBogen();
    void startKarte();
    void startBarcode();

private:
    Ui::CaptureWidget *ui;
    EntityManager *m_em = nullptr;
    Event *m_event = nullptr;
    bool eventFilter(QObject *obj, QEvent *ev);
};
#endif
