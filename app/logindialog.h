#ifndef LOGINDIALOG_H
#define LOGINDIALOG_H

#include <QDialog>
#include <QDomDocument>

namespace Ui {
    class LoginDialog;
}

class EntityManager;
class ConnectionModel;
class EventModel;
class QDataWidgetMapper;
class QItemSelection;
class Event;

class LoginDialog : public QDialog
{
    Q_OBJECT

public:
    explicit LoginDialog(EntityManager *em, QWidget *parent = nullptr);
    ~LoginDialog() override;

    Event *selectedEvent();

private:
    Ui::LoginDialog *ui;
    ConnectionModel *connectionModel;
    EntityManager *em;
    EventModel *eventModel;
    QDataWidgetMapper *mapper;
    Event *m_selectedEvent;

private slots:
    void doLogin();
    void errorHandler(const QString &errorText);
    void checkDatabase();
    void createEvent();
    void importEvent();
    void readGymNetXml(QDomDocument *xmlBOM);
    void selectCurrentEvent();
    void openDatabaseFile();
    void createDatabaseFile();
    void setupPostgresDatabase();
    void connectionListSelectionChanged(const QItemSelection &selected,
                                        const QItemSelection &deselected);
};

#endif // LOGINDIALOG_H
