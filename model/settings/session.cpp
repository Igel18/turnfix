#include "session.h"
#include "model/entity/event.h"
#include <QApplication>
#include <QMutex>
#include <QWidget>


Session *Session::m_instance = nullptr;
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

AbstractConnection* Session::connection()
{
    return m_connection;
}

void Session::setConnection( AbstractConnection* connection )
{
    m_connection = connection;
}

Session* Session::instance()
{
    static QMutex mutex;
    if (!m_instance)
    {
        mutex.lock();

        if (!m_instance)
        {
            m_instance = new Session;
        }

        mutex.unlock();
    }
    return m_instance;
}

void Session::dropInstance()
{
    static QMutex mutex;
    mutex.lock();
    delete m_instance;
    m_instance = nullptr;
    mutex.unlock();
}
