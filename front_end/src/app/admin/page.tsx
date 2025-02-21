import User from "../../types/user";

const AdminPage = async () => {
  const users = await fetch("https://jsonplaceholder.typicode.com/users");
  const usersJson: User[] = await users.json();

  if (!users.ok) {
    return { message: 'Error while fetching the data' }
  }

  return (
    <div>
      <h1 className="text-2xl m-4 mb-8 text-center">Admin Page</h1>
      <ul>
        {usersJson.map((user) => (
          <li
            key={user.id}
            className="p-4 m-2 bg-lightBackGround dark:bg-black shadow-md rounded-md border-gray-700"
          >
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPage;
