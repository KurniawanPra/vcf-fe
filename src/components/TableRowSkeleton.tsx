export default function TableRowSkeleton() {
  return (
    <tr>
      <td><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
    </tr>
  );
}