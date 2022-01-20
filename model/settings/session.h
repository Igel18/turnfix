#ifndef SESSION_H
#define SESSION_H

#include <QObject>

class AbstractConnection;
class EntityManager;
class Event;

class Session : public QObject
{
    Q_OBJECT
public:
    void setEntityManager(EntityManager* em);
    EntityManager* getEntityManager();

    void setEvent(Event* m_event);
    Event* getEvent();

    AbstractConnection* getConnectoin();
    void setConnectoin( AbstractConnection* connection );

    static Session* getInstance();
    static void dropInstance();

private:
    EntityManager* m_em = nullptr;
    Event* m_event = nullptr;
    AbstractConnection* m_connectoin = nullptr;

    static Session* instance;

    Session() {}
    Session(const Session &);
    Session& operator=(const Session &);

};

#endif // SESSION_H
