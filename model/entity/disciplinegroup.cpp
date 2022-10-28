#include "disciplinegroup.h"
#include "model/dbcolumn.h"
#include "model/dbtable.h"

DBTable *DisciplineGroup::initializeMapping()
{
    DBTable *disciplineGroup = new DBTable("tfx_disziplinen_gruppen");
    disciplineGroup
        ->addColumn("id", "int_disziplinen_gruppenid", ColumnType::Integer, 0, false, "", "", true);
    disciplineGroup->addColumn("name", "var_name", ColumnType::Varchar, 100);
    disciplineGroup->addColumn("comment", "txt_comment", ColumnType::Text);

    return disciplineGroup;
}

const DBTable *DisciplineGroup::m_mapping = DisciplineGroup::initializeMapping();

const DBTable *DisciplineGroup::mapping()
{
    return m_mapping;
}

int DisciplineGroup::id() const
{
    return m_id;
}

void DisciplineGroup::setId(int id)
{
    m_id = id;
}

QString DisciplineGroup::name() const
{
    return m_name;
}

void DisciplineGroup::setName(const QString &name)
{
    m_name = name;
}

QString DisciplineGroup::comment() const
{
    return m_comment;
}

void DisciplineGroup::setComment(const QString &comment)
{
    m_comment = comment;
}
