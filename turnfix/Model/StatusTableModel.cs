using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace turnfix.Model
{
    using turnfix.Migrations;
    using turnfix.Models;
    using turnfix.Repository;

    internal class StatusTableModel
    {
        private readonly TurnfixContext context;

        public StatusTableModel(TurnfixContext context)
        {
            this.context = context; 
        }


        /// <summary>
        /// Returns the State of the squads 
        /// </summary>
        public List<Status> getData()
        {
            var repo = new StatusRepository();
            return repo.GetAll(this.context);
        }

        /// <summary>
        /// Returns all disciplines as header for the table 
        /// </summary>
        public List<String> getHeader()
        {
            var repo = new StatusRepository();
            var statusList = repo.GetAll(this.context);
            foreach (var status in statusList)
            {
                // status.AryColorcode 
                // status.VarName 
            }

            return null; 
        }

        /// <summary>
        /// Returns all squads as first Colum 
        /// </summary>
        public void getSquad()
        {

        }
    }
}
