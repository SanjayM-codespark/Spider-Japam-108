import Spinner from './Spinner.jsx'

function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  rowKey = 'id',
}) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`ui-table__th${column.align ? ` ui-table--${column.align}` : ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="ui-table__state">
                <Spinner size="sm" />
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="ui-table__state">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row[rowKey] ?? index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`ui-table__td${column.align ? ` ui-table--${column.align}` : ''}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table