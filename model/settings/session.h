#ifndef SESSION_H
#define SESSION_H

#include <QObject>

class AbstractConnection;
class EntityManager;
class Event;
class MainWindow;

class Session : public QObject
{
    Q_OBJECT
public:
    void setEntityManager(EntityManager* em);
    EntityManager* getEntityManager();

    void setEvent(Event* m_event);
    Event* getEvent();

    AbstractConnection * connection();
    void setConnection( AbstractConnection *connection );

    static Session* instance();
    static void dropInstance();

    static MainWindow* mainWindow();

private:
    EntityManager* m_em = nullptr;
    Event* m_event = nullptr;
    AbstractConnection *m_connection = nullptr;

    static Session *m_instance;
    static MainWindow* m_pMainWindow;

    Session() {}
    Session(const Session &);
    Session& operator=(const Session &);

};

#endif // SESSION_H
