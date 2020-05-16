import resource from 'resource-router-middleware';
import User from '../models/users';

export default ({ config, db }) => resource({
	/** GET / - List all entities */
	async index({ params }, res) {
        try {
            let users = await User.find({});
            res.json(users);
        } catch(err) {
            res.status(500).send(err);
        }
	},

	/** POST / - Create a new entity */
	async create({ body }, res) {
        let name = body.name;
        let email = body.email;

        try {
            let currentUser = await User.findOne({email: email});
            if (currentUser) {
                try {
                    let result = await User.updateOne({
                        email: email
                    }, {name: name});
                    console.log('email : ', result);
                    currentUser.name = name;
                    res.json(currentUser);
                } catch (err) {
                    res.status(500).send(err);
                }
            } else {
                let user = new User({name: name, email: email});

                try {
                    let result = await user.save();
                    res.json(result);
                } catch (err) {
                    res.status(500).send(err);
                }
            }
        } catch (err) {
            res.status(500).send(err);
        }
        
	}
});
