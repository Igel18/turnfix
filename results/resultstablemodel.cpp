#include "resultstablemodel.h"
#include "model/entitymanager.h"
#include "model/repository/competitiondisciplinerepository.h"


ResultsTableModel::ResultsTableModel( EntityManager *em, QObject *parent /*= nullptr*/ )
    : QAbstractTableModel( parent ), m_em( em )
{
}

int ResultsTableModel::rowCount( const QModelIndex& ) const
{
    return list.size();
}

int ResultsTableModel::columnCount( const QModelIndex& ) const
{
    if( list.isEmpty() )
        return 0;

    if( details ) {
        return list.at( 0 ).size() - 1;
    }

    return showHeader ? 4 : 5;
}

QVariant ResultsTableModel::data( const QModelIndex &index, int role ) const
{
    if( index.isValid() && role == Qt::DisplayRole ) {
        const auto col = index.column();
        const auto rowData = list.at( index.row() );

        if( details ) {
            return rowData.at( col );
        } else {
            if( showHeader ) {
                return col == 3 ? rowData.last() : rowData.at( col );
            } else {
                if( col == 2 ) {
                    QStringList values = rowData.at( col ).split(". Mannschaft");
                    if (!showHeader && !values.isEmpty() ) {
                        return "";
                    } else {
                        return rowData.at( col );
                    }
                } else if ( col == 3 ) {
                    return rowData.at( list.at( 0 ).size() - 2 );
                } else if ( col == 4 ) {
                    return rowData.at( list.at(0).size() - 1 );
                } else {
                    return rowData.at(index.column());
                }
            }
        }
    }

    return QVariant();
}

QVariant ResultsTableModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if( showHeader && ( role == Qt::DisplayRole ) && ( orientation == Qt::Horizontal ) ) {
        int s;

        if (wktyp == 0 || wktyp == 2) {
            s = 4;
            switch (section) {
            case 0: return "Platz";
            case 1: return "Name";
            case 2: return "Verein";
            case 3: return "Jg.";
            }
        } else {
            s = 3;
            switch (section) {
            case 0: return "Platz";
            case 1: return "Verein";
            case 2: return "Mannschaft";
            }
        }

        if ( section < headers.size() + s ) {
            return headers.at( section - s );
        } else {
            return "Gesamt";
        }
    }

    return QVariant();
}

void ResultsTableModel::setList( const QList< QStringList >& lst, QString n, int eventId, int typ, bool d /*= true*/, bool head /*= true*/ )
{
    beginResetModel();

    list = lst;
    wktyp = typ;
    hwk = eventId;
    nr = n;
    details = d;
    showHeader = head;
    headers.clear();

    auto items = m_em->competitionDisciplineRepository()->load( eventId, nr );
    for( auto& item : items ){
        auto disciplineShortName = item->discipline()->shortName1();
        if( item->freeAndCompulsary() || item->competition()->freeAndCompulsary() ){
            headers.append( QString( "%1 (P)" ).arg( disciplineShortName ) );
            headers.append( QString( "%1 (K)" ).arg( disciplineShortName ) );
        } else {
            headers.append( disciplineShortName );
        }
    }

    endResetModel();
}
