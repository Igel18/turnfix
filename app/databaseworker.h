#ifndef DATABASEWORKER_H
#define DATABASEWORKER_H

#include <QObject>
#include <QSqlDatabase>
#include "model/querybuilderbase.h"

class DatabaseWorker : public QObject {
    Q_OBJECT

public:
    explicit DatabaseWorker(const QString &connectionName, QObject *parent = nullptr)
        : QObject(parent), m_connectionName(connectionName) {}

    ~DatabaseWorker() {
        if (QSqlDatabase::contains(m_connectionName)) {
            QSqlDatabase::removeDatabase(m_connectionName);
        }
    }

public slots:
    void performQuery(QueryBuilderBase *qb) {
        QSqlDatabase db = QSqlDatabase::addDatabase("QPSQL", m_connectionName);
        db.setHostName("localhost"); // Beispielwerte anpassen
        db.setDatabaseName("your_database");
        db.setUserName("your_username");
        db.setPassword("your_password");

        if (!db.open()) {
            emit queryFailed(db.lastError().text());
            return;
        }

        QList<QVariant> results = qb->execute(db);
        emit querySucceeded(results);

        db.close();
    }

signals:
    void querySucceeded(const QList<QVariant> &result);
    void queryFailed(const QString &error);

private:
    QString m_connectionName;
};

#endif // DATABASEWORKER_H
