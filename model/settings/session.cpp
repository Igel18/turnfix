#include "session.h"
#include "model/entity/event.h"
#include <QApplication>
#include <QMutex>
#include <QWidget>


Session *Session::instance = nullptr;
MainWindow* Session::m_pMainWindow = nullptr;

MainWindow* Session::mainWindow()
{
//    if( !m_pMainWindow ){

//        if( qApp ){
//            auto widgets = qApp->topLevelWidgets();

//            for( QWidget* pWidget : widgets ){
//                if( QString( pWidget->metaObject()->className() ) == "MainWindow" ){
//                    m_pMainWindow = pWidget;
//                }
//            }
//        }
//    }

    return m_pMainWindow;
}

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
