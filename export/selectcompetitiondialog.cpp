#include "selectcompetitiondialog.h"
#include "model/entity/event.h"
#include "model/entitymanager.h"
#include "model/repository/competitionrepository.h"
#include "ui_selectcompetitiondialog.h"
#include <QSqlQuery>

/*
 * The dialog to select the competitions which should be printed
 */
SelectCompetitionDialog::SelectCompetitionDialog(Event *event, EntityManager *em, QWidget *parent)
    : QDialog(parent),
      ui(new Ui::SelectCompetitionDialog),
      m_em(em)
{
    ui->setupUi(this);
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);

    this->m_event = event;

    connect(ui->but_select, SIGNAL(clicked()), this, SLOT(select1()));
    initData();
}

SelectCompetitionDialog::~SelectCompetitionDialog()
{
    delete ui;
}

void SelectCompetitionDialog::initData()
{
    const auto competitions = m_em->competitionRepository()->fetchByEvent(m_event);

    foreach(const Competition *comp, competitions)
    {
        ui->cmb_dis->addItem(comp->number() + " " + comp->name());
    }
}

void SelectCompetitionDialog::select1()
{
    wk = QVariant(ui->cmb_dis->itemData(ui->cmb_dis->currentIndex())).toString();
    done(1);
}

QString SelectCompetitionDialog::getWk()
{
    return wk;
}
