package ca.concordia.pivottable.datalayer.impl;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import ca.concordia.pivottable.datalayer.PivotTableStrategy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Class for implementing single-page pivot table data retrieval strategy.
 * @author	Jyotsana Gupta
 * @version	1.0
 */
public class SinglePageStrategy implements PivotTableStrategy
{
	private List<String> rowLabels;
	private List<String> colLabels;
	private String function;
	private String valField;
	private String filterField;
	private String filterValue;
	private String sortField;
	private String sortOrder;
	private String tableName;
	
	/**
	 * Used for logging information, warning and error messages during application run.
	 */
	private Logger log = LoggerFactory.getLogger(SinglePageStrategy.class);
	
	/**
	 * Class constructor with all the parameters provided.
	 * @param	rowLabels	List of row labels selected as part of pivot table schema
  	 * @param	colLabels	List of column labels selected as part of pivot table schema
  	 * @param	function	Mathematical function selected as part of pivot table schema
  	 * @param	valField	Value field selected as part of pivot table schema
  	 * @param	filterField	Field name by which pivot table data needs to be filtered
  	 * @param	filterValue	Value of the filter field for which pivot table data needs to be displayed
  	 * @param	sortField	Field name by which pivot table data needs to be sorted
  	 * @param	sortOrder	Order (ascending/descending) in which pivot table data needs to be sorted
  	 * @param	tableName	Raw report table name
	 */
	public SinglePageStrategy(List<String> rowLabels, List<String> colLabels, String function, String valField, String filterField, 
								String filterValue, String sortField, String sortOrder, String tableName)
	{
		this.rowLabels = rowLabels;
		this.colLabels = colLabels;
		this.function = function;
		this.valField = valField;
		this.filterField = filterField;
		this.filterValue = filterValue;
		this.sortField = sortField;
		this.sortOrder = sortOrder;
		this.tableName = tableName;
	}
		
	/**
	 * Executes a specific strategy for retrieving pivot table data.
	 * @param	dbConnection	Database connection object
	 * @param	rowLimit		Maximum number of rows to be fetched by any SQL query
	 * @return	Pivot table data
	 */
	public List<List<List<Object>>> getPvtTblData(Connection dbConnection, int rowLimit)
	{
		if (dbConnection == null)							//failed connection
  		{
  			return null;
  		}
  		
  		//Proceeding, if database connection is successful
  		String sortClause = " ";
  		String filterClause = " ";
  		String selectClause = " SELECT ";
  		String grpClause = " GROUP BY ";
  		List<List<List<Object>>> pvtTblData = new ArrayList<List<List<Object>>>();
  		
  		//Generating the SQL query select clause for selecting row labels
  		for (String rowLabel : rowLabels)
  		{
  			selectClause = selectClause + rowLabel + ", ";
  		}
  		
  		//Generating the SQL query select clause for selecting column labels
  		for (String colLabel : colLabels)
  		{
  			selectClause = selectClause + colLabel + ", ";
  		}
  		
  		//Generating the SQL query group by clause for grouping by row labels
  		for (String rowLabel : rowLabels)
  		{
  			grpClause = grpClause + rowLabel + ", ";
  		}
  		
  		//Generating the SQL query group by clause for grouping by column labels
  		for (String colLabel : colLabels)
  		{
  			grpClause = grpClause + colLabel + ", ";
  		}
  		
  		//Removing trailing comma
  		grpClause = grpClause.substring(0, grpClause.lastIndexOf(","));
  		
  		//Generating the SQL query clause for filtering resulting data
  		if ((filterField != null && !filterField.trim().isEmpty()) && (filterValue != null))
  			filterClause = " WHERE " + filterField + " = \'" + filterValue + "\'";
  		
  		//Generating the SQL query clause for sorting resulting data
  		if ((sortField != null && !sortField.trim().isEmpty()) && (sortOrder != null))
  			sortClause = " ORDER BY " + sortField + " " + sortOrder;
  		
  		//Generating and executing the SQL query
  		pvtTblData = executeQuery(dbConnection, rowLimit, selectClause, filterClause, sortClause);

  		return pvtTblData;
	}
	
	/**
	 * Generates and executes an SQL query on database and fetches pivot table data.
	 * @param 	dbConnection	An object of type Connection referring to the data source connection used for executing the query
	 * @param 	rowLimit		Maximum number of rows to be fetched by any SQL query
	 * @param 	selectClause	SQL query clause used for selecting row and column labels values as per the schema
	 * @param 	filterClause	SQL query clause used for filtering pivot table data as per the schema
  	 * @param 	sortClause		SQL query clause used for sorting pivot table data as per the schema
	 * @return	Pivot table data fetched from the database
	 */
	private List<List<List<Object>>> executeQuery(Connection dbConnection, int rowLimit, String selectClause, String filterClause, String sortClause) 
  	{
  		String pvtTblDataQuery = null;  		
  		Statement stmtPvtTblData = null;
  		ResultSet rsPvtTblData = null;
  		ResultSetMetaData rsmdPvtTblData = null;
  		int fieldCount = 0;
  		Set<List<Object>> rowColList = new HashSet<List<Object>>();
  		List<List<Object>> pageData = new ArrayList<List<Object>>();
  		List<List<List<Object>>> pvtTblData = new ArrayList<List<List<Object>>>();
  		
  		//Generating the SQL query to get pivot table data without page label
  		pvtTblDataQuery = selectClause
  							+ valField + " "
  							+ " FROM ( SELECT * FROM " + tableName
  										+ filterClause
										+ " LIMIT " + String.valueOf(rowLimit) + " ) as sublist"
							+ sortClause + ";";
  		
  		//Executing the SQL query
  		try
  		{
  			stmtPvtTblData = dbConnection.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_READ_ONLY);
  			log.info("Running query " + pvtTblDataQuery);
  			rsPvtTblData = stmtPvtTblData.executeQuery(pvtTblDataQuery);
  			
  			//Fetching field count for the results returned by the SQL query executed
  			rsmdPvtTblData = rsPvtTblData.getMetaData();
  			fieldCount = rsmdPvtTblData.getColumnCount();
  			
  			//Fetching pivot table row and column label values
  			while (rsPvtTblData.next())
  			{
  				List<Object> recordRowCol = new ArrayList<Object>();
  				
  				for (int i=1; i<fieldCount; i++)
  				{
  					recordRowCol.add(rsPvtTblData.getObject(i));
  				}
  				
  				rowColList.add(recordRowCol);
  			}
  			
  			//Calculating function field values
  			int i = 0;
  			for (List<Object> recordRowCol : rowColList)
  			{
  				double result = 0;
  				List<Integer> valueList = new ArrayList<Integer>();
  				List<String> countValueList = new ArrayList<String>();
  			
  				rsPvtTblData.beforeFirst();
  				while (rsPvtTblData.next())
  				{
  					boolean getValue = true;
  					for (i=1; i<fieldCount; i++)
  	  				{
  	  					if (!rsPvtTblData.getObject(i).equals(recordRowCol.get(i-1)))
  	  					{
  	  						getValue = false;
  	  						break;
  	  					}
  	  				}
  					
  					if (getValue)
  					{
  						if (function.equalsIgnoreCase("count"))
							countValueList.add(rsPvtTblData.getObject(i).toString());
						else
						{
							int currValue = (Integer)rsPvtTblData.getObject(i);
							valueList.add(currValue);
						}
  					}
  				}
  				
  				if (function.equalsIgnoreCase("count"))
  					result = countValueList.size();
  				else
  					result = calcFunctionValue(function, valueList);
  				recordRowCol.add(fieldCount-1, result);
  				pageData.add(recordRowCol);
  			}
  			
  			//Storing entire pivot table data as the first page since there is only one page in this case
  			pvtTblData.add(pageData);
  			
  			rsPvtTblData.close();
  			stmtPvtTblData.close();
  		}
  		catch (SQLException pvtTblDataSQLExcpn)
  		{
  			stmtPvtTblData = null;
  			rsPvtTblData = null;
  			rsmdPvtTblData = null;
  			pvtTblData = null;
  			log.error("SQLException occurred while fetching pivot table data... " + pvtTblDataSQLExcpn.getMessage());
  		}
  		
  		return pvtTblData;
  	}
	
	/**
  	 * Calculates different summary function values.
  	 * @param 	functionName		Name of the function to be calculated
  	 * @param 	valueList			List of values to be used in calculation
  	 * @return	The result calculated
  	 */  	  	
  	private double calcFunctionValue(String functionName, List<Integer> valueList)
  	{
  		double result = 0;
  		
  		if (functionName.equalsIgnoreCase("Sum"))
  		{
  			result = 0;
  			for (double value : valueList)
  				result += value;
  		}
  		else if (functionName.equalsIgnoreCase("Min"))
  		{
  			result = valueList.get(0);
  			for (double value : valueList)
  			{
  				if (value < result)
  					result = value;
  			}
  		}
  		else if (functionName.equalsIgnoreCase("Max"))
  		{
  			result = valueList.get(0);
  			for (double value : valueList)
  			{
  				if (value > result)
  					result = value;
  			}
  		}
  		else if (functionName.equalsIgnoreCase("Avg"))
  		{
  			result = 0;
  			for (double value : valueList)
  				result += value;
  			result = (result / (valueList.size()));
  		}
  		else if (functionName.equalsIgnoreCase("Product"))
  		{
  			result = 1;
  			for (double value : valueList)
  				result *= value;
  		}
  		else if (functionName.equalsIgnoreCase("Variance"))
  		{
  			double sum = 0;
  			for (double value : valueList)
  				sum += value; 
  			
  			double avg = (sum/valueList.size());
  			
  			double sumSqrDiff = 0;  			
  			for (double value : valueList)
  			{
  				double sqrDiff = (Math.pow((value - avg), 2));
  				sumSqrDiff += sqrDiff; 
  			}
  			
  			result = (sumSqrDiff/valueList.size());
  		}
  		else if (functionName.equalsIgnoreCase("Standard Deviation"))
  		{
  			double sum = 0;
  			for (double value : valueList)
  				sum += value; 
  			
  			double avg = (sum/valueList.size());
  			
  			double sumSqrDiff = 0;  			
  			for (double value : valueList)
  			{
  				double sqrDiff = (Math.pow((value - avg), 2));
  				sumSqrDiff += sqrDiff; 
  			}
  			
  			result = (Math.sqrt((sumSqrDiff/valueList.size())));
  		}
  		
  		return result;
  	}
}
