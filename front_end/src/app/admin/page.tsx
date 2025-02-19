import User from "../../models/user";

const AdminPage = async () => {
  setTimeout(() => {
    console.log("Admin Page Loaded");
  }
  , 5000);
  const users = await fetch("https://jsonplaceholder.typicode.com/users");
  const usersJson: User[] = await users.json();

  return (
    <div>
      <h1 className="text-2xl text-gray-300 m-4 mb-8 text-center">
        Admin Page
      </h1>
      <ul>
        {usersJson.map((user) => (
          <li
            key={user.id}
            className="p-4 m-2 bg-black shadow-md rounded-md border-gray-700"
          >
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPage;
