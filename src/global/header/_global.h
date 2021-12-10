#ifndef _GLOBAL_H
#define _GLOBAL_H

#include <QObject>
#include <QFont>
#include <QVariant>
#include <QStringList>

class EntityManager;
class Event;
class QSqlQuery;

class _global : public QObject {
    Q_OBJECT

public:
    static void setDBTyp(int typ);
    static int getDBTyp();
    static void initFields();
    static QStringList getFields();
    static QString wkBez(Event *m_event, QString swknr);

    /*!
     * \brief updateRgDis updates squads and disciplines mapping (tfx_riegen_x_disziplinen table)
     * \param m_event
     * \param em
     */
    static void updateRgDis(Event *m_event, EntityManager *em = nullptr);
    static QString nameFormat();
    static double calcLeistung(QString value);
    static QList<QVariant> nameSplit(QString name);
    static QString strLeistung(double lst, QString einheit, QString maske, int nk);
    static QList<int> splitColorArray(QString array);
    static QString intListToString(QList<int>);
    static int querySize(QSqlQuery query);
    static QString substring(QString field, QString from);
    static QString date(QString field, int length);
    struct itemdata {
        int id;
        int typ;
        double x;
        double y;
        double width;
        double height;
        QFont font;
        QVariant value;
        int align;
    };
private:
    static int dbtyp;
    static QStringList fields;
};

#endif
