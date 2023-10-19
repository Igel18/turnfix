#ifndef DRUCKEN_H
#define DRUCKEN_H

#include <QMap>
#include <QPainter>
#include <QPrinter>
#include <QSqlQuery>
#include <QThread>

class QFont;
class QRect;
class Event;
class EntityManager;

class Print : public QThread {
    Q_OBJECT

public:
    Print();

    // static methods
    static void setDetailInfo(int);
    static void setHeadFootID(int);
    static void setCoverID(int);
    static void setPaperSize(QPrinter::PaperSize);
    static QPrinter::PaperSize getPaperSize();
    static void setOrientation(QPrinter::Orientation);
    static QPrinter::Orientation getOrientation();

    void setOutputType(int);
    int  getOutputType();
    void setShowPreview(bool);
    void setSelectClub(bool);
    void setSelectRiege(bool);
    void setSelectTN(bool);
    void setSelectWK(bool);
    void setSelectDis(bool);
    void setSelectDetail(bool);
    void setTypeString(QString);
    void setOutputFileName(QString);
    void setWKNumber(QString);
    void setVerein(int);
    void setFinish(bool);
    void setDetailQuery(QString);
    void setSelectedTNWK(QString);
    void setSelectedClubs(QList<int>);
    void setSelectedTN(QList<int>);
    void setTeilnehmerNumbers(QList<int>);
    void setSelectedWKs(QStringList);
    void setSelectedRiegen(QStringList);
    void setSelectedDisziplinen(QList< QList<int> >);
    void init(Event *event, EntityManager *em);

public slots:
    virtual void print(QPrinter*);

protected:
    void run();
    QPrinter *curr_printer;
    QPainter painter;
    QRect pr;
    QFont font;
    QString typeString;

    Event *m_event;
    EntityManager *m_em;

    static int detailinfo;
    bool korr;
    int m_yco; // y for content output ?
    int max_yco;
    int top_yco;
    qreal fontHeight;

    // protected virtual
    virtual void printContent();
    virtual void printSubHeader();

    void printHeadFoot();
    void printDescriptor( QString, bool = false );
    void newPage( bool bPrintHeadFoot = true );
    void finishPrint();
    inline int mmToPixel( double mm ){ return ((double)curr_printer->width() * mm / ((double)curr_printer->widthMM() + 10.0 ) ); }
    void setPrinterFont( int size, bool bold = false, bool italic = false );
    void drawStandardRow(QString plst, QString name, QString jg, QString verein, QString points="", QString extra="");
    QString readDetailInfo(bool head,QString verein="");
    QStringList readDetailInfos(QString verein);
    void printCustomPage(int mode, int layoutid, QStringList tndata=QStringList(), QString tnwk="");
    void drawHighlightRect(qreal y, qreal h=-1);
    void drawTextLine(QString text, int x=0, bool newLine=true);

    int outputType;
    bool showPreview;
    bool selectClub;
    bool selectRiege;
    bool selectTN;
    bool selectWK;
    bool selectDis;
    bool selectDetail;
    bool finish;
    static int headFootID;
    static int coverID;
    QString outputFileName;
    static QPrinter::PaperSize paperSize;
    static QPrinter::Orientation orientation;

    QList<int> vereinNumbers;
    QList< QList<int> > disziplinenIDs;
    QString detailQuery;
    QString teilnehmerString;
    QStringList wkNumbers;
    QString singleWK;
    QList<bool> wkWahl;
    QList<bool> wkKP;
    QStringList riegenNumbers;
    QMap<QString,QImage> customImages;

    QList<int> selectedClubs;
    QStringList selectedWKs;
    QStringList selectedRiegen;
    QList<int> selectedTN;
    QString selectedTNWK;
    QList<int> teilnehmerNumbers;
    QList< QList<int> > selectedDisziplinen;

signals:
    void requestDetailInfo();
    void requestDisziplinen();
    void requestWKs();
    void requestTN();
    void requestVereine();
    void requestRiegen();
    void showPrintPreview(QPrinter*);
};

#endif // DRUCKEN_H
