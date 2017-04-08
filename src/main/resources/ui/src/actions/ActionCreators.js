import {C, getPivotTableState} from '../reducers/RootReducer'
import {getTableList,
  checkAccess,
  getRawReport,
  getPivotTable,
  login,
  logout,
  register,
  getUserInfo,
  getShareableSchema,
  postShareableSchema,
} from '../api/endpoints'

const handleErrorResponse = (e, type, dispatch, additionalMessage = '') => {
  console.log(e)
  let message = `An error occurred. ${additionalMessage}`;
  if (e.response && e.response.data && e.response.data.details) {
    message = `${message} ${e.response.data.details}`
    if (e.response.status >= 400) {
      console.log(`Received a code ${e.response.status}...`);
    }
  }
  dispatch({type, message})
}

export const fetchTableList = () => async (dispatch, getState) => {
  dispatch({type: C.FETCH_TABLE_LIST})
  const {username, password, sourceName} = getPivotTableState(getState())
  try {
    const resp = await getTableList(sourceName, username, password)
    dispatch({type: C.FETCH_TABLE_LIST_SUCCESS, data: resp.data})
  } catch (e) {
    dispatch({type: C.FETCH_TABLE_LIST_ERROR})
  }
}

export const connectToDataSource = (sourceName, username, password) => async (dispatch) => {
  dispatch({type: C.CONNECT_DATA_SOURCE})
  try {
    const resp = await checkAccess(sourceName, username, password)
    dispatch({type: C.CONNECT_DATA_SOURCE_SUCCESS, data: resp.data})
    dispatch(fetchTableList())
  } catch (e) {
    console.log(e)
    dispatch({type: C.CONNECT_DATA_SOURCE_ERROR})
  }
}

const tableSelected = (value) => ({
  type: C.TABLE_SELECTED,
  value
})

export const pivotTablePageChanged = (value) => ({
  type: C.PIVOT_TABLE_PAGE_CHANGED,
  page: value
})

export const fetchRawReport = (tableName) => async (dispatch, getState) => {
  dispatch(tableSelected(tableName))
  if (!tableName)
    return Promise.resolve('')
  dispatch({type:C.FETCH_RAW_REPORT})
  const {username, password, sourceName} = getPivotTableState(getState())
  try {
    const resp = await getRawReport(tableName, sourceName, username, password)
    dispatch({type: C.FETCH_RAW_REPORT_SUCCESS, data: resp.data})
  } catch (e) {
    dispatch({type: C.FETCH_RAW_REPORT_ERROR})
  }
}

// Sync actions

export const userNameChanged = (value) => ({
  type: C.USERNAME_CHANGED,
  value
})

export const passwordChanged = (value) => ({
  type: C.PASSWORD_CHANGED,
  value
})

export const dataSourceNameChanged = (value) => ({
  type: C.DATASOURCE_CHANGED,
  value: value
})

// disconnect is sync since all state is stored in UI
export const disconnect = () => ({
  type: C.DISCONNECT
})

export const rowLabelsChanged = (value) => ({
  type: C.SCHEMA_ROW_LABELS_SELECTED,
  value
})

export const columnLabelsChanged = (value) => ({
  type: C.SCHEMA_COLUMN_LABELS_SELECTED,
  value
})

export const pageLabelChanged = (value) => ({
  type: C.SCHEMA_PAGE_LABEL_SELECTED,
  value
})

export const resetSchema = () => ({
  type: C.SCHEMA_RESET
})

export const functionChanged = (value) => ({
  type: C.SCHEMA_FUNCTION_SELECTED,
  value
})

export const valueChanged = (value) => ({
  type: C.SCHEMA_VALUE_SELECTED,
  value
})

export const filterFieldSelected = (value) => ({
  type: C.FILTER_FIELD_SELECTED,
  value
})

export const filterValueSelected = (value) => ({
  type: C.FILTER_VALUE_SELECTED,
  value
})

export const sortFieldSelected = (value) => ({
  type: C.SORT_FIELD_SELECTED,
  value
})

export const sortOrderSelected = (value) => ({
  type: C.SORT_ORDER_SELECTED,
  value
})

const buildSchemaToSend = ({tableSchema, selectedTable}) => ({
  tableName: selectedTable,
  columnLabels: tableSchema.selectedColumnLabels.map ( it => it.name),
  rowLabels: tableSchema.selectedRowLabels.map (it => it.name),
  pageLabel: tableSchema.selectedPageLabel,
  functionName: tableSchema.selectedFunction,
  valueField: tableSchema.selectedValue,
  filterField: tableSchema.selectedFilterField,
  filterValue: tableSchema.filterValue,
  sortField: tableSchema.selectedSortField,
  sortOrder: tableSchema.sortOrder,
  aliasMap: tableSchema.aliasMap,
  tableSummFuncName: tableSchema.summaryFunction,
})

const buildShareableSchemaToSave = (reducerState) => ({
  schemaID: reducerState.id,
  schemaName: reducerState.tableSchema.name,
  pvtTblSchema: buildSchemaToSend(reducerState),
  dbURL: reducerState.sourceName,
  dbUsername: reducerState.username,
  dbPassword: reducerState.password
})

export const generatePivotTable = () => async(dispatch, getState) => {
  dispatch({type: C.GENERATE_PIVOT_TABLE})
  try {
    const currentState = getPivotTableState(getState())
    const {username, password, sourceName} = currentState
    const resp = await getPivotTable(buildSchemaToSend(currentState),
      sourceName, username, password
    )
    dispatch({type: C.GENERATE_PIVOT_TABLE_SUCCESS, data: resp.data})
  } catch (e) {
    handleErrorResponse(e, C.GENERATE_PIVOT_TABLE_ERROR, dispatch)
  }
}

export const printableViewChanged = (value) => (
  {type: C.TOGGLE_PRINTABLE_VIEW, value}
)

export const aliasChanged = (name, value) => ({
  type: C.SCHEMA_LABEL_ALIAS_CHANGED,
  name,
  value
})

export const summaryFunctionChanged = (value) => ({
  type: C.SCHEMA_SUMMARY_FUNCTION_SELECTED,
  value
})

export const loginFormUsernameChanged = (value) => ({
  type: C.LOGIN_USERNAME_CHANGED,
  value
})

export const loginFormPasswordChanged = (value) => ({
  type: C.LOGIN_PASSWORD_CHANGED,
  value
})

export const registerFormUsernameChanged = (value) => ({
  type: C.REGISTER_USERNAME_CHANGED,
  value
})

export const registerFormPassword1Changed = (value) => ({
  type: C.REGISTER_PASSWORD1_CHANGED,
  value
})

export const registerFormPassword2Changed = (value) => ({
  type: C.REGISTER_PASSWORD2_CHANGED,
  value
})

export const doLogin = (username, password) => async (dispatch) => {
  dispatch({type: C.LOGIN_SUBMIT})
  try {
    const resp = await login(username, password);
    // success
    dispatch({type: C.LOGIN_SUBMIT_SUCCESS, user: resp.data.details})
  } catch (e) {
    handleErrorResponse(e, C.LOGIN_SUBMIT_FAILURE, dispatch, 'Log in failed.');
  }
}

export const doLogout = () => async (dispatch) => {
  dispatch({type: C.LOGOUT})
  try {
    const resp = await logout();
    dispatch({type: C.LOGOUT_SUCCESS})
  } catch (e) {
    handleErrorResponse(e, C.LOGOUT_FAILURE, dispatch, 'Failed to logout.')
  }
}

export const doRegister = (username, password) => async (dispatch) => {
  dispatch({type: C.REGISTER_SUBMIT})
  try {
    const resp = await register(username, password);
    dispatch({type: C.REGISTER_SUBMIT_SUCCESS});
  } catch (e) {
    handleErrorResponse(e, C.REGISTER_SUBMIT_FAILURE, dispatch, 'Registration failed...');
  }
}

export const getCurrentlyLoggedInUser = () => async (dispatch) => {
  dispatch({type: C.FETCH_USER_INFO});
  try {
    const resp = await getUserInfo()
    dispatch({type: C.FETCH_USER_INFO_SUCCESS, user: resp.data.details ? resp.data.details : null})
  } catch (e) {
    handleErrorResponse(e, C.FETCH_USER_INFO_FAILURE, dispatch)
  }
}

export const clearPivotTableStore = () => ({
  type: C.PIVOT_TABLE_CLEAR
})

export const schemaNameChanged = (value) => ({
  type: C.SCHEMA_NAME_CHANGED,
  value
})

export const fetchShareableSchema = (id) => async (dispatch) => {
  dispatch({type: C.FETCH_SHAREABLE_SCHEMA})
  try {
    const resp = await getShareableSchema(id)
    dispatch({type: C.FETCH_SHAREABLE_SCHEMA_SUCCESS, data: resp.data})
    // quick hack to simulate user actions sequentially (api is currently limited)
    const {dbURL, dbUsername, dbPassword, schemaName} = resp.data
    await dispatch(connectToDataSource(dbURL, dbUsername, dbPassword))
    await dispatch(fetchTableList())
    const tableSchema = resp.data.pvtTblSchema;
    await dispatch(fetchRawReport(tableSchema.tableName))
    // I could have the user click on generate pivot table... but we do it for her
    dispatch(rowLabelsChanged(tableSchema.rowLabels))
    dispatch(columnLabelsChanged(tableSchema.columnLabels))
    dispatch(pageLabelChanged(tableSchema.pageLabel))
    dispatch(filterFieldSelected(tableSchema.filterField))
    dispatch(filterValueSelected(tableSchema.filterValue))
    dispatch(sortFieldSelected(tableSchema.sortField))
    dispatch(sortOrderSelected(tableSchema.sortOrder))
    dispatch(functionChanged(tableSchema.functionName))
    dispatch(valueChanged(tableSchema.valueField))
    dispatch(summaryFunctionChanged(tableSchema.tableSummFuncName))
    dispatch({type: C.FETCH_SHAREABLE_SCHEMA_SET_ALIAS, aliasMap: tableSchema.aliasMap})
    dispatch(schemaNameChanged(schemaName))
    return dispatch(generatePivotTable())
  } catch (e) {
    handleErrorResponse(e, C.FETCH_SHAREABLE_SCHEMA_FAILURE, dispatch, 'Error getting schema, table or raw report');
  }
}

export const savePivotTableSchema = () => async (dispatch, getState) => {
  dispatch({type: C.SAVE_SHAREABLE_SCHEMA})
  try {
    const reducerState = getPivotTableState(getState())
    const resp = await postShareableSchema(buildShareableSchemaToSave(reducerState))
    const id = parseInt(resp.data.details, 10)
    dispatch({type: C.SAVE_SHAREABLE_SCHEMA_SUCCESS, id})
  } catch (e) {
    handleErrorResponse(e, C.SAVE_SHAREABLE_SCHEMA_FAILURE, dispatch, 'Could not save schema...')
  }
}
