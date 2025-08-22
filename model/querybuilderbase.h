#ifndef QUERYBUILDERBASE_H
#define QUERYBUILDERBASE_H

#include <QSqlDatabase>
#include <QList>
#include <QVariant>

class QueryBuilderBase {
public:
    virtual ~QueryBuilderBase() = default;

    // Führt die Abfrage aus und gibt die Ergebnisse als QList<QVariant> zurück
    virtual QList<QVariant> execute(QSqlDatabase &db) const = 0;
};

#endif // QUERYBUILDERBASE_H