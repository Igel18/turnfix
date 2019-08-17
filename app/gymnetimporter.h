#ifndef GYMNETIMPORTER_H
#define GYMNETIMPORTER_H

#include <QDomDocument>

class GymNetImporter
{
public:
    GymNetImporter();
    void readGymNetXml(QDomDocument *xmlBOM);
private:

};

#endif // GYMNETIMPORTER_H
