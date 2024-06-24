// GET CheckUser
function qyCheckUser(userId: string) {
  const query = {
    uid: userId,
  };

  const projection = 'uid name username picture';

  return {
    query,
    projection,
  };
}

export { qyCheckUser };
