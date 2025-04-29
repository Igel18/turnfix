using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace turnfix.Repository
{
    using System.Collections;

    using turnfix.Models;

    internal class DisciplineRepository
    {
        public List<Discipline> GetAll(TurnfixContext context)
        {
            var discipline = context.TfxDisziplinens.ToList(); 
            return discipline; 
        }

        public List<Discipline> GetById(TurnfixContext context, string disciplineId)
        {
            var discipline = context.TfxDisziplinens.Where(x => x.IntDisziplinenid.Equals(disciplineId)).ToList();
            return discipline; 
        }

        public List<Discipline> GetScoreDetailsForId(TurnfixContext context, string scoreDetailId)
        {
            var discipline = context.TfxDisziplinens.Where(x => x.TfxWertungenDetails.Equals(scoreDetailId)).ToList();
            return discipline;
        }
    }
}
