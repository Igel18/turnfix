#ifndef PARTICIPANTSQUADMODEL_H
#define PARTICIPANTSQUADMODEL_H

#include <QObject>
#include <QSortFilterProxyModel>

class ParticipantSquadModel : public QSortFilterProxyModel
{
    Q_OBJECT
public:
    explicit ParticipantSquadModel( QString squadName, bool inSquad = true, QObject *parent = nullptr);

    virtual void setSourceModel(QAbstractItemModel *sourceModel) override;

public slots:
    QString squadName() const;
    void setSquadName( QString squadName );

    bool inSquad() const;
    void setInSquad( bool inSquad );

protected:
    bool filterAcceptsRow(int sourceRow, const QModelIndex &sourceParent) const override;

private:
    QString m_sSquadName;
    bool m_bInSquad;
};

#endif // PARTICIPANTSQUADMODEL_H
