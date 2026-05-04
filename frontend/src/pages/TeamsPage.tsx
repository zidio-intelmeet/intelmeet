export default function TeamsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl px-8 py-6 flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">
            Workspace
          </p>

          <h1 className="text-2xl font-bold text-slate-900">
            Team Members
          </h1>
        </div>

        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold">
          Add Member
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <button className="w-full text-left bg-emerald-50 hover:bg-emerald-100 rounded-xl p-4">
                <p className="font-semibold text-gray-900">Add Member</p>
                <p className="text-sm text-gray-500">
                  Invite people to workspace
                </p>
              </button>

              <button className="w-full text-left hover:bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-900">Manage Roles</p>
                <p className="text-sm text-gray-500">
                  Update member permissions
                </p>
              </button>

              <button className="w-full text-left hover:bg-yellow-50 rounded-xl p-4">
                <p className="font-semibold text-gray-900">Send Invite</p>
                <p className="text-sm text-gray-500">
                  Grow your workspace
                </p>
              </button>
            </div>
          </div>

          {/* Recent Members */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Recent Members
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                  JD
                </div>

                <div>
                  <p className="font-semibold text-gray-900">John Doe</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  AS
                </div>

                <div>
                  <p className="font-semibold text-gray-900">Alice Smith</p>
                  <p className="text-sm text-gray-500">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Search */}
          <div className="p-6 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search members..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-4 bg-gray-50 px-6 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-500">Member</p>
            <p className="text-sm font-semibold text-gray-500">Email</p>
            <p className="text-sm font-semibold text-gray-500">Role</p>
            <p className="text-sm font-semibold text-gray-500">Status</p>
          </div>

          {/* Member Row */}
          <div className="grid grid-cols-4 items-center px-6 py-5 border-b border-gray-100 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                JD
              </div>

              <div>
                <p className="font-semibold text-gray-900">John Doe</p>
                <p className="text-sm text-gray-400">Joined April 2026</p>
              </div>
            </div>

            <p className="text-gray-600">john@example.com</p>

            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold w-fit">
              Admin
            </span>

            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-semibold w-fit">
              Active
            </span>
          </div>

          {/* Member Row */}
          <div className="grid grid-cols-4 items-center px-6 py-5 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                AS
              </div>

              <div>
                <p className="font-semibold text-gray-900">Alice Smith</p>
                <p className="text-sm text-gray-400">Joined March 2026</p>
              </div>
            </div>

            <p className="text-gray-600">alice@example.com</p>

            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-semibold w-fit">
              Member
            </span>

            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm font-semibold w-fit">
              Offline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}