#ifndef COMPETITIONPROXYMODEL_H
#define COMPETITIONPROXYMODEL_H

#include <QIdentityProxyModel>

//!
//! \brief The CompetitionProxyModel class serves to adjust model data for using in QComboBoxes
//!
class CompetitionProxyModel : public QIdentityProxyModel
{
    Q_OBJECT

public:
    explicit CompetitionProxyModel( QString prefix = "", QObject *parent = nullptr );

    void setSourceModel(QAbstractItemModel *sourceModel) override;
    QVariant data(const QModelIndex &index, int role) const override;

    void setPrefix( QString prefix );

private:
    QString m_sPrefix;
};

#endif // COMPETITIONPROXYMODEL_H
