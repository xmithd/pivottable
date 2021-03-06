
import {multiplyByArrayLength} from '../utils'
import {C} from './RootReducer'

const numericalFunctions = [
  'sum',
  'min',
  'max',
  'avg',
  'product',
  'standard deviation',
  'variance',
]

const allFunctions = ['count'].concat(numericalFunctions)

// immutable initial state (everything is immutable)
const initialState = {
  id: null,
  fetchLoading: false,
  connectionLoading: false,
  fetchTableListLoading: false,
  selectedTable: '',
  username: '',
  password: '',
  sourceName: '',
  connectedSuccessfully: false,
  tableList: [],
  rawReportLoading: false,
  rawReport: {
    columns: [],
    rows: []
  }, // data set
  tableSchema: {
    name: '',
    rowLabels: [],
    selectedRowLabels: [],
    columnLabels: [],
    selectedColumnLabels: [],
    pageLabels: [],
    selectedPageLabel: '', //name of the field
    functionList: allFunctions,
    selectedFunction: '', //name of the function
    possibleValues: [],
    selectedValue: '', //name of the value
    filterFields: [],
    selectedFilterField: '',
    filterValue: '',
    sortFields: [],
    selectedSortField: '',
    sortOrder: 'asc',
    aliasMap: {}, // stores the [name:alias] for each value
    summaryFunction: '',
  },
  pivotTableLoading: false,
  // 1 pivot table data per page
  pivotTables: [/*{
    rowLabels: [],
    columnLabels: [],
    data: [],
  }*/],
  pageLabels: [],
  pageSelected: -1, // index of the selected page
  tableSummary: '',
  infoMessage: '',
  errorMessage: '',
  printableView: false,
}

/*const rebuildSchemaFromData = (tableSchema, data) => {
  const newSelectedRowLabels = data.rowLabels.map ( name => {
    return tableSchema.rowLabels.find ( val => val.name === name );
  })
  //const newSelectedColumnLabels = data.
}*/

/**
 * row label index: 0
 * column label index: 1
 * data index: dataIndex (usually, 2)
 */
/*const insertIn2D = (rowMap, columnMap, row, dataIndex, data) => {
  //console.log('row from api is: ', row)
  const x = rowMap[row[0]]
  const y = columnMap[row[1]]
  //console.log(`x: ${x}, y: ${y}, data: ${row[dataIndex]}`);
  data[x][y] = row[dataIndex]
} */

const insertInGeneric = (rowMaps, columnMaps, row, rowLabelsLength, rowLabels, columnLabels, dataIndex, data) => {
  const x = rowMaps.reduce( (sum, rowMap, index) => {
    //const sizeOfSpan = (index+1) < (rowLabels.length) ? rowLabels[index+1].length : 1;
    let sizeOfSpan = 1;
    if (index+1 < rowLabels.length) {
      sizeOfSpan = rowLabels.slice(index+1).reduce(multiplyByArrayLength, 1);
    }
    return sum + rowMap[row[index]]*sizeOfSpan
  }, 0);
  const y = columnMaps.reduce( (sum, columnMap, index) => {
    //const sizeOfSpan = (index+1) < columnLabels.length ? columnLabels[index+1].length : 1;
    let sizeOfSpan = 1;
    if (index+1 < columnLabels.length) {
      sizeOfSpan = columnLabels.slice(index+1).reduce(multiplyByArrayLength, 1);
    }
    return sum + columnMap[row[index+rowLabelsLength]]*sizeOfSpan
  }, 0);
  //console.log(`x: ${x}, y: ${y}, data: ${row[dataIndex]}`);
  data[x][y] = row[dataIndex];
};

const extractSummaryData = (pageIndex, infoMaps, infoArray, numberOfPages, summaries) => {
  const itemsPerPage = infoMaps.length; // === (summaries.length / numberOfPages) or number of schema labels
  const indexToExtractFrom = itemsPerPage * pageIndex
  const currentPageInfo = summaries.slice(indexToExtractFrom, indexToExtractFrom+itemsPerPage);
  return currentPageInfo.map ( (current, inverseDimension) => {
    // backend returns highest dimension first.
    const dimension = itemsPerPage - (inverseDimension);
    const currentDimensionArray = infoArray[dimension-1];
    const currentDimensionSize = currentDimensionArray.length;
    let repeatTimes = 1;
    if (dimension > 1) {
      // if it's not the outer most
      repeatTimes = infoArray.slice(0, dimension-1).reduce(multiplyByArrayLength,1);
    }
    let summaryArray = new Array(currentDimensionSize*repeatTimes);
    summaryArray.fill(' ');
    current.forEach (summary => {
      // each value goes into a location
      // summary is an array of size dimension+1;
      const location = infoMaps.reduce( (sum, infoMap, index) => {
        // this time span does not indicate how many cells it spans,
        // but rather how many of the previous dimensions's values it spans.
        let sizeOfSpan = 1;
        if (index+1 < infoArray.length) {
          sizeOfSpan = infoArray.slice(index+1, dimension).reduce(multiplyByArrayLength, 1);
        }
        if (index >= dimension) {
          return sum;
        } else {
          const addedTerm = infoMap[summary[index]] * sizeOfSpan;
          //if (isNaN(addedTerm)) {
          //  console.log('This should not happen.');
          //}
          return sum + addedTerm;
        }
      }, 0);

      summaryArray[location] = summary[dimension];
    })
    return summaryArray;
  });
}

// This code is imperative -> takes data from API and
// returns an object with rowLabels, columnLabels, data and schema
const mapPivotTableDataToRender = (schema, apiDataList, rowSummaries, colSummaries, pageSummaries) => {
  //console.log('Schema: ', schema, 'apiDataList: ', apiDataList)

  const numberOfPages = apiDataList.length

  return apiDataList.map ( (apiData, pageIndex) => {

    // get the row labels, column labels (page labels are handled in the reduce)
    let rowSets = schema.rowLabels.map (it => new Set())
    let columnSets = schema.columnLabels.map (it => new Set())
    // use first one to get the rows and columns
    apiData.forEach( row => {
      row.forEach((element, idx) => {
        if (idx < schema.rowLabels.length) {
          rowSets[idx].add(element)
        } else if (idx >= schema.rowLabels.length && idx < (schema.rowLabels.length + schema.columnLabels.length)) {
          columnSets[idx-schema.rowLabels.length].add(element)
        }
        // could optimize one loop cycle if break here in traditional for loop (vs forEach loop)
      })
    })

    const rows = rowSets.map (rowSet => Array.from(rowSet))
    const columns = columnSets.map (columnSet => Array.from(columnSet))

    const rowMaps = rows.map ( rowSetArray => rowSetArray.reduce((result, val, index) => {
        result[val] = index
        return result
      }, {})
    )

    const columnMaps = columns.map( columnSetArray => columnSetArray.reduce((result, val, index) => {
        result[val] = index
        return result
      }, {})
    )

    // create an array of arrays filled with empty string
    const gridRows = rows.reduce ( multiplyByArrayLength, 1);
    const gridColumns = columns.reduce( multiplyByArrayLength, 1);
    let data = new Array(gridRows)
    for (let i=0; i < data.length; ++i) {
      let col = new Array(gridColumns)
      data[i] = col.fill(' ')
    }

    // The summary data:
    const rowSummaryData = extractSummaryData(pageIndex, rowMaps, rows, numberOfPages, rowSummaries);
    const colSummaryData = extractSummaryData(pageIndex, columnMaps, columns, numberOfPages, colSummaries);

    //console.log('rowMaps', rowMaps)
    //console.log('columnMaps', columnMaps)
    // insert data
    apiData.forEach( row => {
      const rowIndex = (schema.rowLabels.length + schema.columnLabels.length)
      // single label on row and column for now
      // insertIn2D(rowMaps[0], columnMaps[0], row, rowIndex, data)
      // generic one
      insertInGeneric(rowMaps, columnMaps, row, schema.rowLabels.length, rows, columns, rowIndex, data)
    })

    //console.log('final data set is', data)
    return {
      rowLabels: rows,
      columnLabels: columns,
      data,
      schema,
      rowSummaryData,
      colSummaryData,
      pageSummary: pageSummaries[pageIndex]
    };
  })
}

// note: The Spread Operator in {...state} creates a shallow copy of the state object.
// (it can be used with arrays, function arguments also)
// {...state, infoMessage: 'Success"} will create a shallow copy of the state object with infoMessage set to 'Success'
// for more info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator
const pivotTableReducer = (state = initialState, action) => {
  // console.log(action)
  const {type} = action
  switch (type) {
    case C.FETCH_TABLE_LIST:
      return {...state, fetchTableListloading: true}
    case C.FETCH_TABLE_LIST_SUCCESS:
      return {...state, fetchTableListloading: false, tableList: action.data, errorMessage: ''}
    case C.FETCH_TABLE_LIST_ERROR:
      return {...state, fetchTableListloading: false, errorMessage: 'Error getting list of tables'}
    case C.TABLE_SELECTED:
      return {...state, selectedTable: action.value, rawReport: initialState.rawReport}
    case C.CONNECT_DATA_SOURCE:
      return {...state, connectionLoading: true}
    case C.CONNECT_DATA_SOURCE_SUCCESS:
      return {...state,
        connectionLoading: false,
        connectedSuccessfully: true,
        errorMsg: '',
      }
    case C.CONNECT_DATA_SOURCE_ERROR:
      return {...state,
        connectionLoading: false,
        connectedSuccessfully: false,
        errorMessage: 'There was an error connecting.'
      }
    case C.USERNAME_CHANGED:
      return {...state, username: action.value}
    case C.PASSWORD_CHANGED:
      return {...state, password: action.value}
    case C.DATASOURCE_CHANGED:
      return {...state, sourceName: action.value}
    case C.FETCH_RAW_REPORT:
      return {...state, rawReportLoading: true}
    case C.FETCH_RAW_REPORT_SUCCESS:
      return {...state,
        rawReport: action.data,
        rawReportLoading: false,
        tableSchema: {
          ...initialState.tableSchema,
          rowLabels: action.data.columns,
          selectedRowLabels: [],
          columnLabels: [],
          selectedColumnLabels: [],
          pageLabels: [],
          selectedPageLabel: '',
          functionList: initialState.tableSchema.functionList,
          selectedFunction: '',
          possibleValues: [],
          selectedValue: '',
          filterFields: action.data.columns
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: [],
        errorMessage: ''
      }
    case C.FETCH_RAW_REPORT_ERROR:
      return {...state,
        rawReportLoading: false,
        rawReport: initialState.rawReport,
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: [],
        errorMessage: 'There was a problem fetching the raw report'
      }
    case C.DISCONNECT:
      return {...initialState,
        username: state.username,
        sourceName: state.sourceName
      }
    case C.SCHEMA_ROW_LABELS_SELECTED:
      //console.log('Called the reducer for SCHEMA_ROW_LABELS_SELECTED')
      // const newSelectedRowLabels = state.tableSchema.rowLabels.filter(val => action.value.indexOf(val.name) !== -1)
      const newSelectedRowLabels = action.value.map ( name => {
        return state.tableSchema.rowLabels.find ( val => val.name === name );
      })
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedRowLabels: newSelectedRowLabels,
          columnLabels: state.tableSchema.rowLabels.filter(val => {
            return action.value.indexOf(val.name) === -1
          }),
          selectedColumnLabels: [],
          selectedPageLabel: '',
          selectedFunction: '',
          selectedValue: '',
          sortFields: newSelectedRowLabels,
          selectedSortField: '',
          //filterFields: [],
          selectedFilterField: '',
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: []
      }
    case C.SCHEMA_COLUMN_LABELS_SELECTED:
      //const newSelectedColumnLabels =  state.tableSchema.columnLabels.filter (val => {
      //  return action.value.indexOf(val.name) !== -1
      //}) // below one preserves selection order
      const newSelectedColumnLabels = action.value.map ( name => {
        return state.tableSchema.columnLabels.find ( val => val.name === name );
      })
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedColumnLabels: newSelectedColumnLabels,
          pageLabels: state.tableSchema.columnLabels.filter(val => {
            return action.value.indexOf(val.name) === -1
          }),
          selectedPageLabel: '',
          selectedFunction: '',
          selectedValue: '',
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: [],
      }
    case C.SCHEMA_PAGE_LABEL_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedPageLabel: action.value,
          /*functionList: state.rawReport.columns.find( val => {
            return val.name === action.value
          }).type === 'TYPE_NUMERIC' ? ['sum', 'count'] : ['count'],*/
          selectedFunction: '',
          selectedValue: '',
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: []
      }
    case C.SCHEMA_FUNCTION_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedFunction: action.value,
          possibleValues: state.tableSchema.pageLabels.filter(val => {
            // filter out if there is a page selected.
            if (state.tableSchema.selectedPageLabel === val.name) {
              return false;
            }
            if (numericalFunctions.indexOf(action.value) !== -1) {
              return val.type === 'TYPE_NUMERIC'
            }
            // else (count) -> all fields are good (Done filtering out selected page!)

            return true
          }),
          selectedValue: ''
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: []
      }
    case C.SCHEMA_VALUE_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedValue: action.value
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: []
      }
    case C.SCHEMA_RESET:
      return {
        ...state,
        tableSchema: {
          ...initialState.tableSchema,
          rowLabels: state.rawReport.columns,
          selectedRowLabels: [],
          columnLabels: [],
          selectedColumnLabels: [],
          pageLabels: [],
          selectedPageLabel: '',
          functionList: initialState.tableSchema.functionList,
          selectedFunction: '',
          possibleValues: [],
          selectedValue: '',
          aliasMap: {},
        },
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: []
      }
    case C.GENERATE_PIVOT_TABLE:
      return {...state, pivotTableLoading: true}
    case C.GENERATE_PIVOT_TABLE_SUCCESS:
      return {...state,
        pivotTableLoading: false,
        // this function returns an array...
        pivotTables: mapPivotTableDataToRender(
          action.data.schema,
          action.data.data,
          action.data.rowSummDetails,
          action.data.colSummDetails,
          action.data.pageSummDetails
        ),
        pageLabels: action.data.pageLabelValues,
        pageSelected: 0,
        tableSummary: action.data.tableSummDetails,
        errorMessage: '',
        infoMessage: ''
      }
    case C.GENERATE_PIVOT_TABLE_ERROR:
      return {...state,
        pivotTableLoading: false,
        pivotTables: initialState.pivotTables,
        pageSelected: -1,
        pageLabels: [],
        errorMessage: action.message//'Error generating pivot table'
      }
    case C.PIVOT_TABLE_PAGE_CHANGED:
      return {
        ...state,
        pageSelected: action.page
      }
    case C.SORT_ORDER_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          sortOrder: action.value
        },
        pivotTables: initialState.pivotTables,
      }
    case C.SORT_FIELD_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedSortField: action.value
        },
        pivotTables: initialState.pivotTables,
      }
    case C.FILTER_FIELD_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          selectedFilterField: action.value
        },
        pivotTables: initialState.pivotTables
      }

    case C.FILTER_VALUE_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          filterValue: action.value
        },
        pivotTables: initialState.pivotTables,
      }
      // TODO might not need the 3 action types below
    case C.FETCH_FILTER_FIELDS_FAILURE:
      return {
        ...state,
        errorMsg: 'Some error occurred while fetching filter fields'
      }
    case C.TOGGLE_PRINTABLE_VIEW:
      return {
        ...state,
        printableView: action.value //!state.printableView
      }
    case C.SCHEMA_LABEL_ALIAS_CHANGED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          aliasMap: {...state.tableSchema.aliasMap, [action.name]: action.value}
        }
      }
    case C.SCHEMA_SUMMARY_FUNCTION_SELECTED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          summaryFunction: action.value
        }
      }
    case C.PIVOT_TABLE_CLEAR:
      return initialState;
    case C.FETCH_SHAREABLE_SCHEMA:
      return {...state, fetchLoading: true}
    case C.FETCH_SHAREABLE_SCHEMA_SUCCESS: {
      const {data} = action
      return {
        ...initialState,
        id: data.schemaID,
        username: data.dbUsername,
        password: data.dbPassword,
        sourceName: data.dbURL,
      }
    }
    /*case C.FETCH_SHAREABLE_SCHEMA_POPULATE_SCHEMA: {
      const {data} = action
      return {
        ...state,
        tableSchema: rebuildSchemaFromData(state.tableSchema, data.pvtTblSchema)
      }
    }*/
    case C.FETCH_SHAREABLE_SCHEMA_SET_ALIAS: {
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          aliasMap: action.aliasMap
        }
      }
    }
    case C.FETCH_SHAREABLE_SCHEMA_FAILURE:
      return {
        ...state,
        fetchLoading: false,
        errorMessage: action.message,
        infoMessage: '',
      }
    case C.SAVE_SHAREABLE_SCHEMA:
      return {
        ...state,
        fetchLoading: true
      }
    case C.SAVE_SHAREABLE_SCHEMA_SUCCESS:
      return {
        ...state,
        id: action.id,
        infoMessage: 'Schema saved!',
        errorMessage: '',
        fetchLoading: false,
      }
    case C.SAVE_SHAREABLE_SCHEMA_FAILURE:
      return {
        ...state,
        fetchLoading: false,
        infoMessage: '',
        errorMessage: action.message,
      }
    case C.SCHEMA_NAME_CHANGED:
      return {
        ...state,
        tableSchema: {
          ...state.tableSchema,
          name: action.value
        }
      }
    case C.FETCH_FILTER_FIELDS_SUCCESS:
    case C.FETCH_FILTER_FIELDS:
    default:
      return state
  }
}

export default pivotTableReducer;
