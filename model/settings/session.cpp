#include "session.h"
#include "model/entity/event.h"
#include <QMutex>

Session *Session::instance = nullptr;

void Session::setEntityManager(EntityManager* em)
{
    m_em = em;
}

EntityManager* Session::getEntityManager()
{
    return m_em;
}

void Session::setEvent(Event *event)
{
    m_event = event;
}

Event* Session::getEvent()
{
    return m_event;
}

AbstractConnection* Session::getConnectoin()
{
    return m_connectoin;
}

void Session::setConnectoin( AbstractConnection* connection )
{
    m_connectoin = connection;
}

Session* Session::getInstance()
{
    static QMutex mutex;
    if (!instance)
    {
        mutex.lock();

        if (!instance)
        {
            instance = new Session;
        }

        mutex.unlock();
    }
    return instance;
}

void Session::dropInstance()
{
    static QMutex mutex;
    mutex.lock();
    delete instance;
    instance = nullptr;
    mutex.unlock();
}
